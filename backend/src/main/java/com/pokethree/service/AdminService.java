package com.pokethree.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.pokethree.entity.Player;
import com.pokethree.entity.SystemConfig;
import com.pokethree.mapper.PlayerMapper;
import com.pokethree.mapper.SystemConfigMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * 管理后台服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

    private final PlayerMapper playerMapper;
    private final SystemConfigMapper configMapper;

    // ===== 系统配置 =====

    /**
     * 获取所有系统配置
     */
    public Map<String, String> getAllConfig() {
        List<SystemConfig> list = configMapper.selectList(null);
        Map<String, String> map = new LinkedHashMap<>();
        for (SystemConfig c : list) {
            map.put(c.getConfigKey(), c.getConfigValue());
        }
        return map;
    }

    /**
     * 获取单个配置
     */
    public String getConfig(String key, String defaultValue) {
        SystemConfig c = configMapper.selectById(key);
        return c != null ? c.getConfigValue() : defaultValue;
    }

    /**
     * 获取整数配置
     */
    public long getConfigLong(String key, long defaultValue) {
        try {
            return Long.parseLong(getConfig(key, String.valueOf(defaultValue)));
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    /**
     * 获取签到奖励数组
     */
    public int[] getCheckinRewards() {
        String val = getConfig("checkin_rewards", "5000,10000,20000,35000,50000,80000,100000");
        return Arrays.stream(val.split(",")).mapToInt(s -> Integer.parseInt(s.trim())).toArray();
    }

    /**
     * 更新系统配置
     */
    @Transactional
    public void updateConfig(Map<String, String> configs) {
        for (Map.Entry<String, String> entry : configs.entrySet()) {
            SystemConfig existing = configMapper.selectById(entry.getKey());
            if (existing != null) {
                configMapper.update(null, new LambdaUpdateWrapper<SystemConfig>()
                        .eq(SystemConfig::getConfigKey, entry.getKey())
                        .set(SystemConfig::getConfigValue, entry.getValue())
                        .set(SystemConfig::getUpdatedAt, LocalDateTime.now().toString()));
            } else {
                configMapper.insert(new SystemConfig()
                        .setConfigKey(entry.getKey())
                        .setConfigValue(entry.getValue())
                        .setUpdatedAt(LocalDateTime.now().toString()));
            }
        }
        log.info("系统配置已更新: {}", configs.keySet());
    }

    // ===== 用户管理 =====

    /**
     * 分页查询用户列表
     */
    public Map<String, Object> listUsers(int page, int size, Integer status, String keyword) {
        Page<Player> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<Player> wrapper = new LambdaQueryWrapper<>();
        if (status != null) {
            wrapper.eq(Player::getStatus, status);
        }
        if (keyword != null && !keyword.isBlank()) {
            wrapper.like(Player::getName, keyword);
        }
        wrapper.orderByDesc(Player::getCreatedAt);
        Page<Player> result = playerMapper.selectPage(pageParam, wrapper);

        // 统计数据
        long totalUsers = playerMapper.selectCount(null);
        long pendingCount = playerMapper.selectCount(
                new LambdaQueryWrapper<Player>().eq(Player::getStatus, 0));
        long bannedCount = playerMapper.selectCount(
                new LambdaQueryWrapper<Player>().eq(Player::getStatus, 2));

        List<Map<String, Object>> users = new ArrayList<>();
        for (Player p : result.getRecords()) {
            Map<String, Object> u = new LinkedHashMap<>();
            u.put("id", p.getId());
            u.put("name", p.getName());
            u.put("avatar", p.getAvatar());
            u.put("chips", p.getChips());
            u.put("diamonds", p.getDiamonds());
            u.put("totalGames", p.getTotalGames());
            u.put("winGames", p.getWinGames());
            u.put("status", p.getStatus() != null ? p.getStatus() : 1);
            u.put("createdAt", p.getCreatedAt());
            users.add(u);
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("users", users);
        data.put("total", result.getTotal());
        data.put("page", page);
        data.put("size", size);
        data.put("totalUsers", totalUsers);
        data.put("pendingCount", pendingCount);
        data.put("bannedCount", bannedCount);
        return data;
    }

    /**
     * 审批通过用户
     */
    @Transactional
    public void approveUser(String playerId) {
        playerMapper.update(null, new LambdaUpdateWrapper<Player>()
                .eq(Player::getId, playerId)
                .set(Player::getStatus, 1)
                .set(Player::getUpdatedAt, LocalDateTime.now()));
        log.info("管理员审批通过用户: {}", playerId);
    }

    /**
     * 封禁/解封用户
     */
    @Transactional
    public void setUserStatus(String playerId, int status) {
        playerMapper.update(null, new LambdaUpdateWrapper<Player>()
                .eq(Player::getId, playerId)
                .set(Player::getStatus, status)
                .set(Player::getUpdatedAt, LocalDateTime.now()));
        log.info("管理员设置用户状态: {} -> {}", playerId, status);
    }

    /**
     * 编辑用户金币/钻石
     */
    @Transactional
    public void editUser(String playerId, Long chips, Integer diamonds) {
        LambdaUpdateWrapper<Player> wrapper = new LambdaUpdateWrapper<Player>()
                .eq(Player::getId, playerId);
        if (chips != null)
            wrapper.set(Player::getChips, chips);
        if (diamonds != null)
            wrapper.set(Player::getDiamonds, diamonds);
        wrapper.set(Player::getUpdatedAt, LocalDateTime.now());
        playerMapper.update(null, wrapper);
        log.info("管理员编辑用户: {} chips={} diamonds={}", playerId, chips, diamonds);
    }

    // ===== 商城道具管理 =====

    /**
     * 获取商城道具列表（含上下架状态）
     */
    public List<Map<String, Object>> getShopItems(Map<String, Map<String, Object>> shopItems) {
        String disabledStr = getConfig("disabled_shop_items", "");
        Set<String> disabledSet = new HashSet<>(Arrays.asList(disabledStr.split(",")));

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, Map<String, Object>> entry : shopItems.entrySet()) {
            Map<String, Object> item = new LinkedHashMap<>(entry.getValue());
            item.put("itemId", entry.getKey());
            item.put("enabled", !disabledSet.contains(entry.getKey()));
            result.add(item);
        }
        return result;
    }

    /**
     * 切换道具上下架
     */
    @Transactional
    public void toggleShopItem(String itemId, boolean enabled) {
        String disabledStr = getConfig("disabled_shop_items", "");
        Set<String> disabledSet = new HashSet<>(Arrays.asList(disabledStr.split(",")));
        disabledSet.remove(""); // 清理空字符串

        if (enabled) {
            disabledSet.remove(itemId);
        } else {
            disabledSet.add(itemId);
        }

        updateConfig(Map.of("disabled_shop_items", String.join(",", disabledSet)));
        log.info("管理员切换道具: {} enabled={}", itemId, enabled);
    }

    /**
     * 管理员登录校验
     */
    public boolean verifyAdmin(String password) {
        String adminPwd = getConfig("admin_password", "admin123");
        return adminPwd.equals(password);
    }
}
