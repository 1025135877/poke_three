# -*- coding: utf-8 -*-
import pathlib

p = pathlib.Path(r'd:\ideaProject\poke_three\backend\src\main\java\com\pokethree\service\AuthService.java')
content = p.read_text(encoding='utf-8')

# 1. 注入 AdminService
content = content.replace(
    "    private final ItemService itemService;",
    "    private final ItemService itemService;\n    private final AdminService adminService;"
)

# 2. 添加 getShopItems() 公开方法（在 class 结尾前）
# 找到最后的 } 之前插入
getter_method = """
    /**
     * 获取商城商品定义（供 AdminController 使用）
     */
    public Map<String, Map<String, Object>> getShopItems() {
        return SHOP_ITEMS;
    }
"""
# 在 hashPassword 方法后面插入
content = content.replace(
    "    private String hashPassword(String password, String salt)",
    getter_method + "    private String hashPassword(String password, String salt)"
)

# 3. 修改 register 方法中的默认金币和钻石 — 改为从动态配置读取
content = content.replace(
    '                .setChips(888230L)',
    '                .setChips(adminService.getConfigLong("default_chips", 888230L))'
)
content = content.replace(
    '                .setDiamonds(520)',
    '                .setDiamonds((int) adminService.getConfigLong("default_diamonds", 520))'
)

# 4. 注册时设置 status=0（待审核）
content = content.replace(
    '                .setMaxWin(0L)\n                .setCreatedAt(LocalDateTime.now())',
    '                .setMaxWin(0L)\n                .setStatus(0)\n                .setCreatedAt(LocalDateTime.now())'
)

# 5. 登录时检查用户状态
old_login_log = '        log.info("玩家登录: {} ({})", name, player.getId());'
new_login_check = """        // 检查用户状态
        int status = player.getStatus() != null ? player.getStatus() : 1;
        if (status == 0) {
            throw new IllegalArgumentException("账号待管理员审核，请耐心等待");
        }
        if (status == 2) {
            throw new IllegalArgumentException("账号已被封禁，请联系管理员");
        }

        log.info("玩家登录: {} ({})", name, player.getId());"""
content = content.replace(old_login_log, new_login_check)

# 6. 签到奖励改为动态读取
content = content.replace(
    '        int rewardIndex = Math.min(dayCount - 1, CHECKIN_REWARDS.length - 1);\n        int rewardChips = CHECKIN_REWARDS[rewardIndex];',
    '        int[] rewards = adminService.getCheckinRewards();\n        int rewardIndex = Math.min(dayCount - 1, rewards.length - 1);\n        int rewardChips = rewards[rewardIndex];'
)

p.write_text(content, encoding='utf-8')
print('Done! AuthService patched.')
