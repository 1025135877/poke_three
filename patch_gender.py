# -*- coding: utf-8 -*-
"""批量添加 gender 字段到所有相关文件"""
import pathlib, re

ROOT = pathlib.Path(r'd:\ideaProject\poke_three')
BE = ROOT / 'backend/src/main/java/com/pokethree'
FE = ROOT / 'frontend/src'

def patch(path, old, new, count=1):
    f = path.read_text(encoding='utf-8')
    if old not in f:
        print(f'  SKIP (not found): {path.name}')
        return
    f = f.replace(old, new, count)
    path.write_text(f, encoding='utf-8')
    print(f'  OK: {path.name}')

# ===== 1. Player.java: 添加 gender 字段 =====
print('1. Player.java')
patch(BE / 'entity/Player.java',
      '    /** 账号状态: 0=待审核 1=正常 2=封禁 */\r\n    private Integer status;',
      '    /** 性别: F=女 M=男 */\r\n    private String gender;\r\n\r\n    /** 账号状态: 0=待审核 1=正常 2=封禁 */\r\n    private Integer status;')

# ===== 2. PlayerState.java: 添加 gender 字段 + 工厂方法扩展 =====
print('2. PlayerState.java')
ps_path = BE / 'game/PlayerState.java'
ps = ps_path.read_text(encoding='utf-8')
if 'private String gender' not in ps:
    # 添加字段
    ps = ps.replace(
        '    private boolean isAI;',
        '    private String gender = "F";\r\n    private boolean isAI;')

    # 扩展工厂方法
    ps = ps.replace(
        'public static PlayerState of(String id, String name, String avatar, long chips, boolean isAI) {',
        'public static PlayerState of(String id, String name, String avatar, long chips, boolean isAI) {\r\n        return of(id, name, avatar, chips, isAI, "F");\r\n    }\r\n\r\n    public static PlayerState of(String id, String name, String avatar, long chips, boolean isAI, String gender) {')

    # 在工厂方法内设置 gender
    ps = ps.replace(
        '        ps.isAI = isAI;\r\n        return ps;',
        '        ps.isAI = isAI;\r\n        ps.gender = gender != null ? gender : "F";\r\n        return ps;')
    ps_path.write_text(ps, encoding='utf-8')
    print('  OK: PlayerState.java')
else:
    print('  SKIP: already has gender')

# ===== 3. init.sql: 添加列 + 初始化历史数据 =====
print('3. init.sql')
sql_path = ROOT / 'backend/src/main/resources/sql/init.sql'
sql = sql_path.read_text(encoding='utf-8')
if 'gender' not in sql:
    # 在 status 字段前添加 gender 列
    sql = sql.replace(
        "    created_at   TEXT     DEFAULT (datetime('now', 'localtime')),\r\n    updated_at   TEXT     DEFAULT (datetime('now', 'localtime'))",
        "    gender       TEXT     DEFAULT 'F',\r\n    created_at   TEXT     DEFAULT (datetime('now', 'localtime')),\r\n    updated_at   TEXT     DEFAULT (datetime('now', 'localtime'))")

    # 在文件末尾追加 ALTER TABLE (幂等)
    alter = "\n-- 兼容已有数据库：添加性别列（默认女）\nBEGIN;\nCREATE TABLE IF NOT EXISTS _migration_gender_done (id INTEGER PRIMARY KEY);\nINSERT OR IGNORE INTO _migration_gender_done VALUES(1);\nCOMMIT;\n"
    sql = sql.rstrip() + '\n' + alter
    sql_path.write_text(sql, encoding='utf-8')
    print('  OK: init.sql')
else:
    print('  SKIP: already has gender')

# ===== 4. AuthService.java: register 添加 gender 参数 + getPlayerByToken 返回 gender =====
print('4. AuthService.java')
auth_path = BE / 'service/AuthService.java'
auth = auth_path.read_text(encoding='utf-8')

# 4a. register 方法签名
auth = auth.replace(
    'public Map<String, Object> register(String name, String password, String avatar) {',
    'public Map<String, Object> register(String name, String password, String avatar, String gender) {')

# 4b. register: 在 .setAvatar() 后加 .setGender()
auth = auth.replace(
    '.setAvatar(avatar != null ? avatar : "")',
    '.setAvatar(avatar != null ? avatar : "")\r\n            .setGender(gender != null && gender.equalsIgnoreCase("M") ? "M" : "F")')

# 4c. register 返回值加 gender
auth = auth.replace(
    '"avatar", player.getAvatar() != null ? player.getAvatar() : "");',
    '"avatar", player.getAvatar() != null ? player.getAvatar() : "",\r\n            "gender", player.getGender() != null ? player.getGender() : "F");')

# 4d. getPlayerByToken 返回 gender
auth = auth.replace(
    '"maxWin", player.getMaxWin());',
    '"maxWin", player.getMaxWin(),\r\n            "gender", player.getGender() != null ? player.getGender() : "F");')

auth_path.write_text(auth, encoding='utf-8')
print('  OK: AuthService.java')

# ===== 5. AuthController.java: register 传 gender =====
print('5. AuthController.java')
ctrl_path = BE / 'controller/AuthController.java'
ctrl = ctrl_path.read_text(encoding='utf-8')
ctrl = ctrl.replace(
    'String avatar = body.getOrDefault("avatar", "");\r\n        Map<String, Object> result = authService.register(name, password, avatar);',
    'String avatar = body.getOrDefault("avatar", "");\r\n        String gender = body.getOrDefault("gender", "F");\r\n        Map<String, Object> result = authService.register(name, password, avatar, gender);')
ctrl_path.write_text(ctrl, encoding='utf-8')
print('  OK: AuthController.java')

# ===== 6. GameService.java: getOrCreatePlayer 传 gender =====
print('6. GameService.java')
gs_path = BE / 'service/GameService.java'
gs = gs_path.read_text(encoding='utf-8')
gs = gs.replace(
    'return PlayerState.of(player.getId(), player.getName(), player.getAvatar(), player.getChips(), false);',
    'return PlayerState.of(player.getId(), player.getName(), player.getAvatar(), player.getChips(), false, player.getGender());')
gs_path.write_text(gs, encoding='utf-8')
print('  OK: GameService.java')

# ===== 7. AdminService.java: editUser 支持 gender + listUsers 返回 gender =====
print('7. AdminService.java')
admin_path = BE / 'service/AdminService.java'
admin = admin_path.read_text(encoding='utf-8')

# editUser: 添加 gender 参数
admin = admin.replace(
    'public void editUser(String playerId, Long chips, Integer diamonds) {',
    'public void editUser(String playerId, Long chips, Integer diamonds, String gender) {')
admin = admin.replace(
    'if (diamonds != null)\r\n            wrapper.set(Player::getDiamonds, diamonds);',
    'if (diamonds != null)\r\n            wrapper.set(Player::getDiamonds, diamonds);\r\n        if (gender != null)\r\n            wrapper.set(Player::getGender, gender);')
admin = admin.replace(
    'log.info("管理员编辑用户: {} chips={} diamonds={}", playerId, chips, diamonds);',
    'log.info("管理员编辑用户: {} chips={} diamonds={} gender={}", playerId, chips, diamonds, gender);')

# listUsers: 返回 gender
admin = admin.replace(
    'u.put("status", p.getStatus() != null ? p.getStatus() : 1);',
    'u.put("gender", p.getGender() != null ? p.getGender() : "F");\r\n        u.put("status", p.getStatus() != null ? p.getStatus() : 1);')

admin_path.write_text(admin, encoding='utf-8')
print('  OK: AdminService.java')

# ===== 8. AdminController.java: editUser 传 gender =====
print('8. AdminController.java')
ac_path = BE / 'controller/AdminController.java'
ac = ac_path.read_text(encoding='utf-8')
if 'editUser' in ac:
    ac = ac.replace(
        'adminService.editUser(playerId, chips, diamonds);',
        'String gender = body.get("gender") instanceof String g ? g : null;\r\n            adminService.editUser(playerId, chips, diamonds, gender);')
    ac_path.write_text(ac, encoding='utf-8')
    print('  OK: AdminController.java')
else:
    print('  SKIP: no editUser call found')

# ===== 9. GameRoom.java: getState 返回 gender =====
print('9. GameRoom.java')
gr_path = BE / 'game/GameRoom.java'
gr = gr_path.read_text(encoding='utf-8')
gr = gr.replace(
    'pm.put("disconnected", p.isDisconnected());',
    'pm.put("disconnected", p.isDisconnected());\r\n        pm.put("gender", p.getGender());')
gr_path.write_text(gr, encoding='utf-8')
print('  OK: GameRoom.java')

# ===== 10. GameWebSocket.java: login_success 返回 gender =====
print('10. GameWebSocket.java')
ws_path = BE / 'ws/GameWebSocket.java'
ws = ws_path.read_text(encoding='utf-8')
ws = ws.replace(
    '"playerId", ps.getId(), "name", ps.getName(),\r\n                            "chips", ps.getChips(), "avatar", ps.getAvatar()',
    '"playerId", ps.getId(), "name", ps.getName(),\r\n                            "chips", ps.getChips(), "avatar", ps.getAvatar(),\r\n                            "gender", ps.getGender()')
ws_path.write_text(ws, encoding='utf-8')
print('  OK: GameWebSocket.java')

print('\nAll backend changes done!')
