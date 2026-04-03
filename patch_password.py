# -*- coding: utf-8 -*-
import pathlib

# ===== 1. init.sql: 添加密码策略配置 =====
sql_path = pathlib.Path(r'd:\ideaProject\poke_three\backend\src\main\resources\sql\init.sql')
sql = sql_path.read_text(encoding='utf-8')
pwd_inserts = """
-- 密码复杂度策略
INSERT OR IGNORE INTO t_system_config(config_key, config_value) VALUES ('pwd_min_length', '6');
INSERT OR IGNORE INTO t_system_config(config_key, config_value) VALUES ('pwd_require_upper', 'false');
INSERT OR IGNORE INTO t_system_config(config_key, config_value) VALUES ('pwd_require_lower', 'false');
INSERT OR IGNORE INTO t_system_config(config_key, config_value) VALUES ('pwd_require_digit', 'false');
INSERT OR IGNORE INTO t_system_config(config_key, config_value) VALUES ('pwd_require_symbol', 'false');
"""
if 'pwd_min_length' not in sql:
    sql = sql.rstrip() + '\n' + pwd_inserts
    sql_path.write_text(sql, encoding='utf-8')
    print('init.sql: password policy configs added')
else:
    print('init.sql: already has password configs')

# ===== 2. AdminService.java: 添加 validatePassword 方法 =====
admin_path = pathlib.Path(r'd:\ideaProject\poke_three\backend\src\main\java\com\pokethree\service\AdminService.java')
admin = admin_path.read_text(encoding='utf-8')

validate_method = '''
    /**
     * 根据系统配置校验密码复杂度
     */
    public void validatePassword(String password) {
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("密码不能为空");
        }
        int minLen = (int) getConfigLong("pwd_min_length", 6);
        if (password.length() < minLen) {
            throw new IllegalArgumentException("密码长度不能少于" + minLen + "位");
        }
        if ("true".equals(getConfigValue("pwd_require_upper"))) {
            if (!password.chars().anyMatch(Character::isUpperCase)) {
                throw new IllegalArgumentException("密码必须包含大写字母");
            }
        }
        if ("true".equals(getConfigValue("pwd_require_lower"))) {
            if (!password.chars().anyMatch(Character::isLowerCase)) {
                throw new IllegalArgumentException("密码必须包含小写字母");
            }
        }
        if ("true".equals(getConfigValue("pwd_require_digit"))) {
            if (!password.chars().anyMatch(Character::isDigit)) {
                throw new IllegalArgumentException("密码必须包含数字");
            }
        }
        if ("true".equals(getConfigValue("pwd_require_symbol"))) {
            if (password.chars().allMatch(c -> Character.isLetterOrDigit(c))) {
                throw new IllegalArgumentException("密码必须包含特殊符号");
            }
        }
    }
'''

if 'validatePassword' not in admin:
    # 在最后一个 } 之前插入
    admin = admin.rstrip()
    last_brace = admin.rfind('}')
    admin = admin[:last_brace] + validate_method + '\n}\n'
    admin_path.write_text(admin, encoding='utf-8')
    print('AdminService: validatePassword added')
else:
    print('AdminService: validatePassword already exists')

# ===== 3. AuthService.java: 添加 changePassword 方法 =====
auth_path = pathlib.Path(r'd:\ideaProject\poke_three\backend\src\main\java\com\pokethree\service\AuthService.java')
auth = auth_path.read_text(encoding='utf-8')

change_pwd_method = '''
    /**
     * 修改密码
     */
    public void changePassword(String playerId, String oldPassword, String newPassword) {
        if (oldPassword == null || oldPassword.isBlank()) {
            throw new IllegalArgumentException("请输入旧密码");
        }
        if (newPassword == null || newPassword.isBlank()) {
            throw new IllegalArgumentException("请输入新密码");
        }

        Player player = playerMapper.selectById(playerId);
        if (player == null) {
            throw new IllegalArgumentException("用户不存在");
        }

        String hashed = hashPassword(oldPassword, player.getSalt());
        if (!hashed.equals(player.getPassword())) {
            throw new IllegalArgumentException("旧密码错误");
        }

        // 校验新密码复杂度
        adminService.validatePassword(newPassword);

        String newSalt = generateSalt();
        String newHashed = hashPassword(newPassword, newSalt);
        player.setSalt(newSalt);
        player.setPassword(newHashed);
        playerMapper.updateById(player);
    }
'''

if 'changePassword' not in auth:
    # 在 getShopItems 方法之前插入
    marker = '    /**\n     * 获取商城商品定义'
    if marker in auth:
        auth = auth.replace(marker, change_pwd_method + '\n' + marker)
    else:
        # fallback: 在 hashPassword 前插入
        auth = auth.replace(
            '    private String hashPassword(String password, String salt)',
            change_pwd_method + '\n    private String hashPassword(String password, String salt)'
        )
    auth_path.write_text(auth, encoding='utf-8')
    print('AuthService: changePassword added')
else:
    print('AuthService: changePassword already exists')

# ===== 4. 在 register 方法中添加密码校验 =====
auth = auth_path.read_text(encoding='utf-8')
# 找到 register 方法中 String salt = generateSalt() 之前的位置
old_reg = '        String salt = generateSalt();'
new_reg = '        // 校验密码复杂度\n        adminService.validatePassword(password);\n\n        String salt = generateSalt();'
if 'adminService.validatePassword(password)' not in auth:
    auth = auth.replace(old_reg, new_reg, 1)
    auth_path.write_text(auth, encoding='utf-8')
    print('AuthService: register password validation added')
else:
    print('AuthService: register already has validation')

# ===== 5. AuthController.java: 添加 change-password 接口 =====
ctrl_path = pathlib.Path(r'd:\ideaProject\poke_three\backend\src\main\java\com\pokethree\controller\AuthController.java')
ctrl = ctrl_path.read_text(encoding='utf-8')

change_pwd_endpoint = '''
    /**
     * 修改密码
     * POST /api/auth/change-password
     * Body: { "oldPassword": "xxx", "newPassword": "xxx" }
     */
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @RequestHeader(value = "Authorization", required = false) String token,
            @RequestBody Map<String, String> body) {
        String playerId = requireAuth(token);
        if (playerId == null) {
            return ResponseEntity.ok(Map.of("code", 1, "message", "未登录"));
        }
        try {
            String oldPwd = body.get("oldPassword");
            String newPwd = body.get("newPassword");
            authService.changePassword(playerId, oldPwd, newPwd);
            return ResponseEntity.ok(Map.of("code", 0, "message", "密码修改成功"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.ok(Map.of("code", 1, "message", e.getMessage()));
        }
    }
'''

if 'change-password' not in ctrl:
    # 在 // ===== 辅助 ===== 之前插入
    ctrl = ctrl.replace('    // ===== 辅助 =====', change_pwd_endpoint + '\n    // ===== 辅助 =====')
    ctrl_path.write_text(ctrl, encoding='utf-8')
    print('AuthController: change-password endpoint added')
else:
    print('AuthController: change-password already exists')

print('All backend changes done!')
