package com.pokethree.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.pokethree.entity.GameRecord;
import com.pokethree.entity.Player;
import com.pokethree.mapper.GameRecordMapper;
import com.pokethree.mapper.PlayerMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 认证服务 — 注册、登录、token 验证
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final PlayerMapper playerMapper;
    private final GameRecordMapper gameRecordMapper;
    private final TokenStore tokenStore;

    /**
     * 注册新玩家
     * 
     * @return {token, player} 或抛出异常
     */
    public Map<String, Object> register(String name, String password, String avatar) {
        // 校验参数
        if (name == null || name.isBlank() || name.length() > 20) {
            throw new IllegalArgumentException("昵称不能为空且不超过20个字符");
        }
        if (password == null || password.length() < 6) {
            throw new IllegalArgumentException("密码不能少于6位");
        }

        // 检查昵称唯一性
        Long count = playerMapper.selectCount(
                new LambdaQueryWrapper<Player>().eq(Player::getName, name));
        if (count > 0) {
            throw new IllegalArgumentException("该昵称已被使用");
        }

        // 生成盐值和密码哈希
        String salt = generateSalt();
        String hashedPassword = hashPassword(password, salt);

        // 创建玩家
        Player player = new Player()
                .setId("player_" + UUID.randomUUID().toString().substring(0, 8))
                .setName(name)
                .setPassword(hashedPassword)
                .setSalt(salt)
                .setAvatar(avatar != null ? avatar : "")
                .setChips(888230L)
                .setDiamonds(520)
                .setTotalGames(0)
                .setWinGames(0)
                .setMaxWin(0L)
                .setCreatedAt(LocalDateTime.now())
                .setUpdatedAt(LocalDateTime.now());
        playerMapper.insert(player);

        log.info("新玩家注册: {} ({})", name, player.getId());

        // 生成 token
        String token = tokenStore.createToken(player.getId());

        return Map.of(
                "token", token,
                "playerId", player.getId(),
                "name", player.getName(),
                "chips", player.getChips(),
                "diamonds", player.getDiamonds(),
                "avatar", player.getAvatar() != null ? player.getAvatar() : "");
    }

    /**
     * 登录
     * 
     * @return {token, player} 或抛出异常
     */
    public Map<String, Object> login(String name, String password) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("请输入昵称");
        }
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("请输入密码");
        }

        // 查询玩家
        Player player = playerMapper.selectOne(
                new LambdaQueryWrapper<Player>().eq(Player::getName, name));
        if (player == null) {
            throw new IllegalArgumentException("账号不存在");
        }

        // 验证密码
        String hashed = hashPassword(password, player.getSalt());
        if (!hashed.equals(player.getPassword())) {
            throw new IllegalArgumentException("密码错误");
        }

        log.info("玩家登录: {} ({})", name, player.getId());

        // 生成 token
        String token = tokenStore.createToken(player.getId());

        return Map.of(
                "token", token,
                "playerId", player.getId(),
                "name", player.getName(),
                "chips", player.getChips(),
                "diamonds", player.getDiamonds(),
                "avatar", player.getAvatar() != null ? player.getAvatar() : "");
    }

    /**
     * 通过 token 获取玩家信息
     */
    public Map<String, Object> getPlayerByToken(String token) {
        String playerId = tokenStore.getPlayerId(token);
        if (playerId == null) {
            return null;
        }

        Player player = playerMapper.selectById(playerId);
        if (player == null) {
            tokenStore.removeToken(token);
            return null;
        }

        return Map.of(
                "playerId", player.getId(),
                "name", player.getName(),
                "chips", player.getChips(),
                "diamonds", player.getDiamonds(),
                "avatar", player.getAvatar() != null ? player.getAvatar() : "",
                "totalGames", player.getTotalGames(),
                "winGames", player.getWinGames(),
                "maxWin", player.getMaxWin());
    }

    /**
     * 通过 token 获取 playerId
     */
    public String getPlayerIdByToken(String token) {
        return tokenStore.getPlayerId(token);
    }

    /**
     * 获取玩家游戏记录
     */
    public List<Map<String, Object>> getPlayerRecords(String playerId, int limit) {
        var wrapper = new LambdaQueryWrapper<GameRecord>()
                .eq(GameRecord::getPlayerId, playerId)
                .orderByDesc(GameRecord::getPlayedAt)
                .last("LIMIT " + Math.min(limit, 50));
        var records = gameRecordMapper.selectList(wrapper);

        return records.stream().map(r -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("roomType", r.getRoomType());
            map.put("handType", r.getHandType());
            map.put("betAmount", r.getBetAmount());
            map.put("profit", r.getProfit());
            map.put("isWinner", r.getIsWinner());
            map.put("playedAt", r.getPlayedAt() != null ? r.getPlayedAt().toString() : "");
            return map;
        }).toList();
    }

    // ===== 工具方法 =====

    private String generateSalt() {
        byte[] salt = new byte[16];
        new SecureRandom().nextBytes(salt);
        return Base64.getEncoder().encodeToString(salt);
    }

    private String hashPassword(String password, String salt) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(salt.getBytes(StandardCharsets.UTF_8));
            byte[] hash = md.digest(password.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            throw new RuntimeException("密码哈希失败", e);
        }
    }

    /**
     * 获取排行榜数据
     */
    public Map<String, Object> getLeaderboard(String currentPlayerId, int limit) {
        // 按金币倒序查询前N名
        var wrapper = new LambdaQueryWrapper<Player>()
                .orderByDesc(Player::getChips)
                .last("LIMIT " + Math.min(limit, 100));
        var players = playerMapper.selectList(wrapper);

        // 构建排行榜列表
        List<Map<String, Object>> rankings = new java.util.ArrayList<>();
        for (int i = 0; i < players.size(); i++) {
            Player p = players.get(i);
            double winRate = p.getTotalGames() > 0
                    ? Math.round(p.getWinGames() * 1000.0 / p.getTotalGames()) / 10.0
                    : 0.0;
            Map<String, Object> item = new java.util.HashMap<>();
            item.put("rank", i + 1);
            item.put("name", p.getName());
            item.put("avatar", p.getAvatar() != null ? p.getAvatar() : "");
            item.put("chips", p.getChips());
            item.put("winRate", winRate);
            item.put("totalGames", p.getTotalGames());
            item.put("playerId", p.getId());
            rankings.add(item);
        }

        // 计算当前用户排名
        int myRank = -1;
        if (currentPlayerId != null) {
            // 统计有多少玩家金币比我多
            Player me = playerMapper.selectById(currentPlayerId);
            if (me != null) {
                Long count = playerMapper.selectCount(
                        new LambdaQueryWrapper<Player>().gt(Player::getChips, me.getChips()));
                myRank = count.intValue() + 1;
            }
        }

        // 总奖池 = 所有玩家金币之和
        Long totalChips = playerMapper.selectList(new LambdaQueryWrapper<Player>()
                .select(Player::getChips))
                .stream().mapToLong(Player::getChips).sum();

        // 总玩家数
        Long totalPlayers = playerMapper.selectCount(new LambdaQueryWrapper<Player>());

        Map<String, Object> result = new java.util.HashMap<>();
        result.put("rankings", rankings);
        result.put("myRank", myRank);
        result.put("totalChips", totalChips);
        result.put("totalPlayers", totalPlayers);
        return result;
    }
}
