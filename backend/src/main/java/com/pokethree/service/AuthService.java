package com.pokethree.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.pokethree.entity.DailyCheckin;
import com.pokethree.entity.DailyTask;
import com.pokethree.entity.GameRecord;
import com.pokethree.entity.Player;
import com.pokethree.mapper.DailyCheckinMapper;
import com.pokethree.mapper.DailyTaskMapper;
import com.pokethree.mapper.GameRecordMapper;
import com.pokethree.mapper.PlayerMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * 认证服务 — 注册、登录、token 验证、签到、任务、商城
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final PlayerMapper playerMapper;
    private final GameRecordMapper gameRecordMapper;
    private final TokenStore tokenStore;
    private final DailyCheckinMapper checkinMapper;
    private final DailyTaskMapper taskMapper;

    // ===== 签到奖励配置 =====
    private static final int[] CHECKIN_REWARDS = { 5000, 10000, 20000, 35000, 50000, 80000, 100000 };

    // ===== 每日任务定义 =====
    private static final List<Map<String, Object>> TASK_DEFINITIONS = List.of(
            Map.of("type", "checkin", "name", "每日签到", "desc", "完成今日签到", "reward", 2000, "icon", "event_available"),
            Map.of("type", "play_1", "name", "对战一局", "desc", "完成1局游戏", "reward", 5000, "icon", "sports_esports"),
            Map.of("type", "play_3", "name", "对战三局", "desc", "完成3局游戏", "reward", 15000, "icon", "emoji_events"),
            Map.of("type", "win_1", "name", "首次获胜", "desc", "赢得1局游戏", "reward", 10000, "icon", "military_tech"),
            Map.of("type", "ai_play", "name", "挑战人机", "desc", "完成1局人机对战", "reward", 3000, "icon", "smart_toy"));

    // ===== 商城商品定义 =====
    private static final Map<String, Map<String, Object>> SHOP_ITEMS = Map.of(
            "coins_100k",
            Map.of("name", "一袋金币", "desc", "100,000 金币", "priceType", "cash", "price", 200, "reward", 100000,
                    "rewardType", "chips"),
            "coins_500k",
            Map.of("name", "一罐金币", "desc", "500,000 金币", "priceType", "cash", "price", 1000, "reward", 500000,
                    "rewardType", "chips"),
            "coins_1500k",
            Map.of("name", "一箱金币", "desc", "1,500,000 金币", "priceType", "cash", "price", 2800, "reward", 1500000,
                    "rewardType", "chips"),
            "coins_10m",
            Map.of("name", "超级大金库", "desc", "10,000,000 金币", "priceType", "cash", "price", 16800, "reward", 10000000,
                    "rewardType", "chips"),
            "diamonds_60",
            Map.of("name", "碎钻包", "desc", "60 钻石", "priceType", "cash", "price", 600, "reward", 60, "rewardType",
                    "diamonds"),
            "starter_pack",
            Map.of("name", "新手大礼包", "desc", "5,000,000 金币 + 限定头像框", "priceType", "cash", "price", 600, "reward",
                    5000000, "rewardType", "chips"),
            "d2c_50k",
            Map.of("name", "钻石兑金币", "desc", "用50钻石兑换50,000金币", "priceType", "diamonds", "price", 50, "reward", 50000,
                    "rewardType", "chips"),
            "d2c_200k", Map.of("name", "钻石兑金币", "desc", "用150钻石兑换200,000金币", "priceType", "diamonds", "price", 150,
                    "reward", 200000, "rewardType", "chips"));

    // ===================================================================
    // 注册 / 登录 / Token
    // ===================================================================

    /**
     * 注册新玩家
     *
     * @return {token, player} 或抛出异常
     */
    public Map<String, Object> register(String name, String password, String avatar) {
        if (name == null || name.isBlank() || name.length() > 20) {
            throw new IllegalArgumentException("昵称不能为空且不超过20个字符");
        }
        if (password == null || password.length() < 6) {
            throw new IllegalArgumentException("密码不能少于6位");
        }

        Long count = playerMapper.selectCount(
                new LambdaQueryWrapper<Player>().eq(Player::getName, name));
        if (count > 0) {
            throw new IllegalArgumentException("该昵称已被使用");
        }

        String salt = generateSalt();
        String hashedPassword = hashPassword(password, salt);

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

        Player player = playerMapper.selectOne(
                new LambdaQueryWrapper<Player>().eq(Player::getName, name));
        if (player == null) {
            throw new IllegalArgumentException("账号不存在");
        }

        String hashed = hashPassword(password, player.getSalt());
        if (!hashed.equals(player.getPassword())) {
            throw new IllegalArgumentException("密码错误");
        }

        log.info("玩家登录: {} ({})", name, player.getId());

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
     * 登出
     */
    public void logout(String token) {
        if (token != null && !token.isBlank()) {
            tokenStore.removeToken(token);
            log.info("玩家登出: token={}", token.length() > 8 ? token.substring(0, 8) + "..." : token);
        }
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
            Map<String, Object> map = new HashMap<>();
            map.put("roomType", r.getRoomType());
            map.put("handType", r.getHandType());
            map.put("betAmount", r.getBetAmount());
            map.put("profit", r.getProfit());
            map.put("isWinner", r.getIsWinner());
            map.put("playedAt", r.getPlayedAt() != null ? r.getPlayedAt().toString() : "");
            return map;
        }).toList();
    }

    // ===================================================================
    // 每日签到
    // ===================================================================

    /**
     * 每日签到
     *
     * @return {dayCount, rewardChips, totalChips}
     */
    @Transactional
    public Map<String, Object> dailyCheckin(String playerId) {
        String today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);

        // 检查今日是否已签到
        DailyCheckin existing = checkinMapper.selectOne(
                new LambdaQueryWrapper<DailyCheckin>()
                        .eq(DailyCheckin::getPlayerId, playerId)
                        .eq(DailyCheckin::getCheckinDate, today));
        if (existing != null) {
            throw new IllegalArgumentException("今日已签到");
        }

        // 查询昨日签到，判断是否连续
        String yesterday = LocalDate.now().minusDays(1).format(DateTimeFormatter.ISO_LOCAL_DATE);
        DailyCheckin yesterdayCheckin = checkinMapper.selectOne(
                new LambdaQueryWrapper<DailyCheckin>()
                        .eq(DailyCheckin::getPlayerId, playerId)
                        .eq(DailyCheckin::getCheckinDate, yesterday));

        int dayCount = (yesterdayCheckin != null) ? yesterdayCheckin.getDayCount() + 1 : 1;
        int rewardIndex = Math.min(dayCount - 1, CHECKIN_REWARDS.length - 1);
        int rewardChips = CHECKIN_REWARDS[rewardIndex];

        // 保存签到记录
        DailyCheckin checkin = new DailyCheckin()
                .setPlayerId(playerId)
                .setCheckinDate(today)
                .setDayCount(dayCount)
                .setRewardChips(rewardChips);
        checkinMapper.insert(checkin);

        // 增加金币
        Player player = playerMapper.selectById(playerId);
        long newChips = player.getChips() + rewardChips;
        playerMapper.update(null, new LambdaUpdateWrapper<Player>()
                .eq(Player::getId, playerId)
                .set(Player::getChips, newChips)
                .set(Player::getUpdatedAt, LocalDateTime.now()));

        // 标记签到任务完成
        updateTaskProgress(playerId, "checkin");

        log.info("玩家签到: {} 连续{}天 奖励{}金币", playerId, dayCount, rewardChips);

        return Map.of("dayCount", dayCount, "rewardChips", rewardChips, "totalChips", newChips);
    }

    /**
     * 获取签到状态
     *
     * @return {checkedInToday, dayCount, nextReward, rewardList}
     */
    public Map<String, Object> getCheckinStatus(String playerId) {
        String today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);

        DailyCheckin todayCheckin = checkinMapper.selectOne(
                new LambdaQueryWrapper<DailyCheckin>()
                        .eq(DailyCheckin::getPlayerId, playerId)
                        .eq(DailyCheckin::getCheckinDate, today));

        boolean checkedInToday = todayCheckin != null;
        int dayCount = 0;

        if (checkedInToday) {
            dayCount = todayCheckin.getDayCount();
        } else {
            // 查询昨日，判断连续天数
            String yesterday = LocalDate.now().minusDays(1).format(DateTimeFormatter.ISO_LOCAL_DATE);
            DailyCheckin yesterdayCheckin = checkinMapper.selectOne(
                    new LambdaQueryWrapper<DailyCheckin>()
                            .eq(DailyCheckin::getPlayerId, playerId)
                            .eq(DailyCheckin::getCheckinDate, yesterday));
            dayCount = (yesterdayCheckin != null) ? yesterdayCheckin.getDayCount() : 0;
        }

        int nextRewardIndex = Math.min(dayCount, CHECKIN_REWARDS.length - 1);
        int nextReward = checkedInToday ? 0 : CHECKIN_REWARDS[nextRewardIndex];

        // 构建7天奖励列表
        List<Map<String, Object>> rewardList = new ArrayList<>();
        for (int i = 0; i < CHECKIN_REWARDS.length; i++) {
            Map<String, Object> item = new HashMap<>();
            item.put("day", i + 1);
            item.put("reward", CHECKIN_REWARDS[i]);
            item.put("claimed", checkedInToday ? (i < dayCount) : (i < dayCount));
            item.put("current", checkedInToday ? (i == dayCount - 1) : (i == dayCount));
            rewardList.add(item);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("checkedInToday", checkedInToday);
        result.put("dayCount", dayCount);
        result.put("nextReward", nextReward);
        result.put("rewardList", rewardList);
        return result;
    }

    // ===================================================================
    // 每日任务
    // ===================================================================

    /**
     * 获取今日任务列表（自动初始化）
     */
    public List<Map<String, Object>> getDailyTasks(String playerId) {
        String today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);

        // 自动初始化今日任务
        for (Map<String, Object> def : TASK_DEFINITIONS) {
            String taskType = (String) def.get("type");
            DailyTask existing = taskMapper.selectOne(
                    new LambdaQueryWrapper<DailyTask>()
                            .eq(DailyTask::getPlayerId, playerId)
                            .eq(DailyTask::getTaskDate, today)
                            .eq(DailyTask::getTaskType, taskType));
            if (existing == null) {
                DailyTask task = new DailyTask()
                        .setPlayerId(playerId)
                        .setTaskDate(today)
                        .setTaskType(taskType)
                        .setIsCompleted(0)
                        .setIsClaimed(0);
                taskMapper.insert(task);
            }
        }

        // 查询今日所有任务
        List<DailyTask> tasks = taskMapper.selectList(
                new LambdaQueryWrapper<DailyTask>()
                        .eq(DailyTask::getPlayerId, playerId)
                        .eq(DailyTask::getTaskDate, today));

        // 合并任务定义和实际进度
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> def : TASK_DEFINITIONS) {
            String taskType = (String) def.get("type");
            DailyTask task = tasks.stream()
                    .filter(t -> taskType.equals(t.getTaskType()))
                    .findFirst().orElse(null);

            Map<String, Object> item = new HashMap<>(def);
            item.put("isCompleted", task != null && task.getIsCompleted() == 1);
            item.put("isClaimed", task != null && task.getIsClaimed() == 1);
            result.add(item);
        }

        return result;
    }

    /**
     * 更新任务进度
     */
    public void updateTaskProgress(String playerId, String taskType) {
        String today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);

        // 确保任务记录存在
        DailyTask task = taskMapper.selectOne(
                new LambdaQueryWrapper<DailyTask>()
                        .eq(DailyTask::getPlayerId, playerId)
                        .eq(DailyTask::getTaskDate, today)
                        .eq(DailyTask::getTaskType, taskType));

        if (task == null) {
            task = new DailyTask()
                    .setPlayerId(playerId)
                    .setTaskDate(today)
                    .setTaskType(taskType)
                    .setIsCompleted(1)
                    .setIsClaimed(0);
            taskMapper.insert(task);
        } else if (task.getIsCompleted() == 0) {
            taskMapper.update(null, new LambdaUpdateWrapper<DailyTask>()
                    .eq(DailyTask::getId, task.getId())
                    .set(DailyTask::getIsCompleted, 1));
        }
    }

    /**
     * 领取任务奖励
     */
    @Transactional
    public Map<String, Object> claimTaskReward(String playerId, String taskType) {
        String today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);

        DailyTask task = taskMapper.selectOne(
                new LambdaQueryWrapper<DailyTask>()
                        .eq(DailyTask::getPlayerId, playerId)
                        .eq(DailyTask::getTaskDate, today)
                        .eq(DailyTask::getTaskType, taskType));

        if (task == null) {
            throw new IllegalArgumentException("任务不存在");
        }
        if (task.getIsCompleted() == 0) {
            throw new IllegalArgumentException("任务尚未完成");
        }
        if (task.getIsClaimed() == 1) {
            throw new IllegalArgumentException("奖励已领取");
        }

        // 查询任务奖励金额
        int reward = TASK_DEFINITIONS.stream()
                .filter(d -> taskType.equals(d.get("type")))
                .map(d -> (Integer) d.get("reward"))
                .findFirst().orElse(0);

        // 标记已领取
        taskMapper.update(null, new LambdaUpdateWrapper<DailyTask>()
                .eq(DailyTask::getId, task.getId())
                .set(DailyTask::getIsClaimed, 1));

        // 增加金币
        Player player = playerMapper.selectById(playerId);
        long newChips = player.getChips() + reward;
        playerMapper.update(null, new LambdaUpdateWrapper<Player>()
                .eq(Player::getId, playerId)
                .set(Player::getChips, newChips)
                .set(Player::getUpdatedAt, LocalDateTime.now()));

        log.info("玩家领取任务奖励: {} 任务={} 奖励={}金币", playerId, taskType, reward);

        return Map.of("reward", reward, "totalChips", newChips);
    }

    // ===================================================================
    // 商城购买
    // ===================================================================

    /**
     * 模拟购买商品
     * priceType: cash（模拟现金，目前直接通过） / diamonds（扣除钻石）
     * 预留支付宝/微信对接：当 priceType=cash 时，
     * 未来替换为 createPayOrder() 返回支付参数，回调后再发放奖励
     *
     * @return {itemName, rewardAmount, rewardType, totalChips, totalDiamonds}
     */
    @Transactional
    public Map<String, Object> purchaseItem(String playerId, String itemId) {
        Map<String, Object> item = SHOP_ITEMS.get(itemId);
        if (item == null) {
            throw new IllegalArgumentException("商品不存在");
        }

        Player player = playerMapper.selectById(playerId);
        if (player == null) {
            throw new IllegalArgumentException("玩家不存在");
        }

        String priceType = (String) item.get("priceType");
        int price = (Integer) item.get("price");
        int reward = (Integer) item.get("reward");
        String rewardType = (String) item.get("rewardType");

        // === 扣费逻辑 ===
        if ("diamonds".equals(priceType)) {
            // 钻石支付
            if (player.getDiamonds() < price) {
                throw new IllegalArgumentException("钻石不足，需要 " + price + " 颗钻石");
            }
            playerMapper.update(null, new LambdaUpdateWrapper<Player>()
                    .eq(Player::getId, playerId)
                    .set(Player::getDiamonds, player.getDiamonds() - price));
            player.setDiamonds(player.getDiamonds() - price);
        } else {
            // priceType == "cash"
            // 模拟现金支付：直接通过（预留支付宝/微信接口）
            // TODO: 对接真实支付
            // 1. 调用 PaymentService.createOrder(playerId, itemId, price)
            // 2. 返回支付参数（支付宝 tradeNo / 微信 prepay_id）
            // 3. 前端跳转支付页面
            // 4. 支付回调 PaymentService.onPaySuccess(orderId)
            // 5. 在回调中调用本方法的发放逻辑
            log.info("模拟现金支付: 玩家={} 商品={} 金额={}分", playerId, itemId, price);
        }

        // === 发放奖励 ===
        long newChips = player.getChips();
        int newDiamonds = player.getDiamonds();

        if ("chips".equals(rewardType)) {
            newChips += reward;
            playerMapper.update(null, new LambdaUpdateWrapper<Player>()
                    .eq(Player::getId, playerId)
                    .set(Player::getChips, newChips)
                    .set(Player::getUpdatedAt, LocalDateTime.now()));
        } else if ("diamonds".equals(rewardType)) {
            newDiamonds += reward;
            playerMapper.update(null, new LambdaUpdateWrapper<Player>()
                    .eq(Player::getId, playerId)
                    .set(Player::getDiamonds, newDiamonds)
                    .set(Player::getUpdatedAt, LocalDateTime.now()));
        }

        log.info("购买成功: 玩家={} 商品={} 发放 {} {}", playerId, item.get("name"), reward, rewardType);

        Map<String, Object> result = new HashMap<>();
        result.put("itemName", item.get("name"));
        result.put("rewardAmount", reward);
        result.put("rewardType", rewardType);
        result.put("totalChips", newChips);
        result.put("totalDiamonds", newDiamonds);
        return result;
    }

    // ===================================================================
    // 排行榜
    // ===================================================================

    /**
     * 获取排行榜数据
     */
    public Map<String, Object> getLeaderboard(String currentPlayerId, int limit) {
        var wrapper = new LambdaQueryWrapper<Player>()
                .orderByDesc(Player::getChips)
                .last("LIMIT " + Math.min(limit, 100));
        var players = playerMapper.selectList(wrapper);

        List<Map<String, Object>> rankings = new ArrayList<>();
        for (int i = 0; i < players.size(); i++) {
            Player p = players.get(i);
            double winRate = p.getTotalGames() > 0
                    ? Math.round(p.getWinGames() * 1000.0 / p.getTotalGames()) / 10.0
                    : 0.0;
            Map<String, Object> item = new HashMap<>();
            item.put("rank", i + 1);
            item.put("name", p.getName());
            item.put("avatar", p.getAvatar() != null ? p.getAvatar() : "");
            item.put("chips", p.getChips());
            item.put("winRate", winRate);
            item.put("totalGames", p.getTotalGames());
            item.put("playerId", p.getId());
            rankings.add(item);
        }

        int myRank = -1;
        if (currentPlayerId != null) {
            Player me = playerMapper.selectById(currentPlayerId);
            if (me != null) {
                Long count = playerMapper.selectCount(
                        new LambdaQueryWrapper<Player>().gt(Player::getChips, me.getChips()));
                myRank = count.intValue() + 1;
            }
        }

        Long totalChips = playerMapper.selectList(new LambdaQueryWrapper<Player>()
                .select(Player::getChips))
                .stream().mapToLong(Player::getChips).sum();

        Long totalPlayers = playerMapper.selectCount(new LambdaQueryWrapper<Player>());

        Map<String, Object> result = new HashMap<>();
        result.put("rankings", rankings);
        result.put("myRank", myRank);
        result.put("totalChips", totalChips);
        result.put("totalPlayers", totalPlayers);
        return result;
    }

    // ===================================================================
    // 工具方法
    // ===================================================================

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
}
