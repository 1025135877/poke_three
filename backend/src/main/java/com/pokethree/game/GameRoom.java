package com.pokethree.game;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.function.BiConsumer;

/**
 * 单局游戏房间 — 状态机
 * 阶段：waiting → betting → showdown → finished
 */
@Slf4j
public class GameRoom {

    public enum Phase {
        WAITING, BETTING, SHOWDOWN, FINISHED
    }

    // ===== 房间配置 =====
    private final String id;
    private final String roomType;
    private final long ante;
    private final int maxPlayers;

    // ===== 游戏状态 =====
    private Phase phase = Phase.WAITING;
    private long pot = 0;
    private long currentBet = 0;
    private int round = 0;
    private static final int MAX_ROUNDS = 20;

    /** 当前回合的玩家顺序（ID列表） */
    private final List<String> turnOrder = new ArrayList<>();
    private int currentPlayerIndex = 0;

    /** playerId -> PlayerState */
    private final Map<String, PlayerState> players = new ConcurrentHashMap<>();

    @JsonIgnore
    private final CardDeck deck = new CardDeck();

    /** 事件回调：(roomId, event, data, targetPlayerId) null表示广播 */
    @JsonIgnore
    private BiConsumer<String, RoomEvent> eventCallback;

    @JsonIgnore
    private static final ScheduledThreadPoolExecutor scheduler = new ScheduledThreadPoolExecutor(2);
    @JsonIgnore
    private ScheduledFuture<?> turnTimer;
    private static final long TURN_TIMEOUT_SECS = 30;

    public GameRoom(String id, String roomType, long ante, int maxPlayers) {
        this.id = id;
        this.roomType = roomType;
        this.ante = ante;
        this.maxPlayers = maxPlayers;
    }

    // ===== 玩家操作 =====

    public synchronized void addPlayer(PlayerState player) {
        if (players.size() >= maxPlayers)
            throw new IllegalStateException("房间已满");
        if (phase != Phase.WAITING)
            throw new IllegalStateException("游戏已开始");
        players.put(player.getId(), player);
        broadcast("player_joined", Map.of("playerId", player.getId(), "playerName", player.getName()));
    }

    public synchronized void removePlayer(String playerId) {
        if (!players.containsKey(playerId))
            return;
        players.remove(playerId);
        broadcast("player_left", Map.of("playerId", playerId));
        if (phase == Phase.BETTING)
            checkGameEnd();
    }

    public synchronized void playerReady(String playerId) {
        PlayerState p = players.get(playerId);
        if (p == null)
            return;
        p.setReady(true);
        broadcast("player_ready", Map.of("playerId", playerId));

        long readyCount = players.values().stream().filter(PlayerState::isReady).count();
        if (readyCount >= 2 && readyCount == players.size()) {
            startGame();
        }
    }

    public synchronized void startGame() {
        if (players.size() < 2)
            throw new IllegalStateException("至少需要2名玩家");
        phase = Phase.BETTING;
        pot = 0;
        round = 1;
        currentBet = ante;
        deck.reset().shuffle();
        turnOrder.clear();

        for (PlayerState p : players.values()) {
            p.setHand(deck.deal(3));
            p.setHasLooked(false);
            p.setHasFolded(false);
            p.setAllIn(false);
            p.setCurrentRoundBet(0);
            p.setReady(false);
            p.setChips(p.getChips() - ante);
            p.setCurrentRoundBet(ante);
            pot += ante;
            turnOrder.add(p.getId());
        }
        currentPlayerIndex = 0;

        broadcast("game_started", Map.of(
                "pot", pot, "ante", ante,
                "playerCount", players.size(),
                "currentPlayer", turnOrder.get(0)));

        // 单独给每人发私有手牌
        for (PlayerState p : players.values()) {
            notifyPlayer(p.getId(), "deal_cards", Map.of("cards", p.getHand()));
        }
        startTurnTimer();
    }

    public synchronized void playerAction(String playerId, String action, long amount) {
        if (phase != Phase.BETTING)
            throw new IllegalStateException("当前不在下注阶段");
        if (!turnOrder.get(currentPlayerIndex).equals(playerId))
            throw new IllegalStateException("还没轮到你操作");

        PlayerState p = players.get(playerId);
        if (p == null || p.isHasFolded())
            throw new IllegalStateException("无效的玩家");

        cancelTurnTimer();

        switch (action) {
            case "look" -> {
                p.setHasLooked(true);
                notifyPlayer(playerId, "cards_revealed", Map.of("cards", p.getHand()));
                broadcast("player_looked", Map.of("playerId", playerId));
                startTurnTimer();
                return; // 看牌不消耗回合
            }
            case "fold" -> {
                p.setHasFolded(true);
                broadcast("player_folded", Map.of("playerId", playerId));
            }
            case "call" -> {
                long callAmount = p.isHasLooked() ? currentBet * 2 : currentBet;
                deductChips(p, callAmount);
                broadcast("player_called", Map.of("playerId", playerId, "amount", callAmount, "pot", pot));
            }
            case "raise" -> {
                long raiseBase = amount > 0 ? amount : currentBet * 2;
                long actualAmount = p.isHasLooked() ? raiseBase * 2 : raiseBase;
                currentBet = raiseBase;
                deductChips(p, actualAmount);
                broadcast("player_raised", Map.of("playerId", playerId,
                        "amount", actualAmount, "newBet", currentBet, "pot", pot));
            }
            case "all_in" -> {
                long allInAmount = p.getChips();
                long totalInvest = p.getCurrentRoundBet() + allInAmount;
                p.setChips(0);
                p.setAllIn(true);
                p.setCurrentRoundBet(totalInvest);
                pot += allInAmount;
                // 如果全押总投入大于当前注额的2倍（明牌）或1倍（暗牌），更新 currentBet
                long effectiveBet = p.isHasLooked() ? totalInvest / 2 : totalInvest;
                if (effectiveBet > currentBet) {
                    currentBet = effectiveBet;
                }
                broadcast("player_all_in", Map.of("playerId", playerId, "amount", allInAmount, "pot", pot));
            }
            default -> throw new IllegalArgumentException("未知操作: " + action);
        }

        nextTurn();
    }

    // ===== 状态查询 =====

    public Map<String, Object> getState(String viewerId) {
        List<Map<String, Object>> playerList = new ArrayList<>();
        for (PlayerState p : players.values()) {
            Map<String, Object> pm = new HashMap<>();
            pm.put("id", p.getId());
            pm.put("name", p.getName());
            pm.put("avatar", p.getAvatar());
            pm.put("chips", p.getChips());
            pm.put("hasFolded", p.isHasFolded());
            pm.put("hasLooked", p.isHasLooked());
            pm.put("isAllIn", p.isAllIn());
            pm.put("isReady", p.isReady());
            pm.put("currentRoundBet", p.getCurrentRoundBet());
            // 只向本人显示手牌
            if (p.getId().equals(viewerId))
                pm.put("hand", p.getHand());
            playerList.add(pm);
        }
        Map<String, Object> state = new HashMap<>();
        state.put("roomId", id);
        state.put("roomType", roomType);
        state.put("phase", phase.name().toLowerCase());
        state.put("pot", pot);
        state.put("ante", ante);
        state.put("currentBet", currentBet);
        state.put("round", round);
        state.put("currentPlayer", turnOrder.isEmpty() ? null : turnOrder.get(currentPlayerIndex));
        state.put("players", playerList);
        return state;
    }

    public synchronized void resetForNextGame() {
        phase = Phase.WAITING;
        pot = 0;
        currentBet = 0;
        round = 0;
        turnOrder.clear();
        cancelTurnTimer();
        players.values().forEach(p -> {
            p.setHand(List.of());
            p.setHasLooked(false);
            p.setHasFolded(false);
            p.setAllIn(false);
            p.setReady(false);
            p.setCurrentRoundBet(0);
        });
        broadcast("room_reset", Map.of());
    }

    // ===== 内部逻辑 =====

    private void deductChips(PlayerState p, long amount) {
        if (p.getChips() < amount)
            throw new IllegalStateException("筹码不足");
        p.setChips(p.getChips() - amount);
        p.setCurrentRoundBet(p.getCurrentRoundBet() + amount);
        pot += amount;
    }

    private void nextTurn() {
        if (checkGameEnd())
            return;

        int attempts = 0;
        do {
            currentPlayerIndex = (currentPlayerIndex + 1) % turnOrder.size();
            attempts++;
            if (attempts > turnOrder.size()) {
                showdown();
                return;
            }
        } while (isInactive(turnOrder.get(currentPlayerIndex)));

        if (currentPlayerIndex == 0) {
            round++;
            if (round > MAX_ROUNDS) {
                showdown();
                return;
            }
        }

        broadcast("next_turn", Map.of(
                "currentPlayer", turnOrder.get(currentPlayerIndex),
                "round", round, "pot", pot));
        startTurnTimer();
    }

    private boolean isInactive(String pid) {
        PlayerState p = players.get(pid);
        return p == null || p.isHasFolded() || p.isAllIn();
    }

    private boolean checkGameEnd() {
        List<String> active = turnOrder.stream()
                .filter(id -> {
                    PlayerState p = players.get(id);
                    return p != null && !p.isHasFolded();
                })
                .toList();
        if (active.size() <= 1) {
            if (!active.isEmpty())
                declareWinner(active.get(0), null);
            return true;
        }
        List<String> canAct = active.stream()
                .filter(id -> !players.get(id).isAllIn()).toList();
        if (canAct.size() <= 1) {
            showdown();
            return true;
        }
        return false;
    }

    private void showdown() {
        phase = Phase.SHOWDOWN;
        cancelTurnTimer();

        // 收集所有未弃牌的玩家及其牌型
        record Contender(String playerId, HandResult result, long totalBet) {}
        List<Contender> contenders = turnOrder.stream()
                .filter(id -> { PlayerState p = players.get(id); return p != null && !p.isHasFolded(); })
                .map(id -> new Contender(id, HandEvaluator.evaluate(players.get(id).getHand()),
                        players.get(id).getCurrentRoundBet()))
                .toList();

        if (contenders.isEmpty()) return;
        if (contenders.size() == 1) {
            // 只剩一人，直接赢
            distributeSingleWinner(contenders.get(0).playerId());
            return;
        }

        // ===== 边池计算 =====
        // 按投入额从小到大排序
        List<Contender> sorted = contenders.stream()
                .sorted(Comparator.comparingLong(Contender::totalBet))
                .collect(java.util.stream.Collectors.toList());

        // 构建边池列表
        record SidePot(long amount, List<String> eligible) {}
        List<SidePot> sidePots = new ArrayList<>();
        long prevLevel = 0;

        for (int i = 0; i < sorted.size(); i++) {
            long level = sorted.get(i).totalBet();
            if (level <= prevLevel) continue;

            long diff = level - prevLevel;
            // 此边池金额 = diff × 能参与此级别的人数（含已弃牌玩家的贡献）
            long potAmount = 0;
            for (PlayerState p : players.values()) {
                long contrib = Math.min(p.getCurrentRoundBet(), level) - Math.min(p.getCurrentRoundBet(), prevLevel);
                potAmount += contrib;
            }

            // 有资格赢此边池的玩家 = 投入 >= level 的未弃牌玩家
            List<String> eligible = sorted.stream()
                    .filter(c -> c.totalBet() >= level)
                    .map(Contender::playerId)
                    .toList();

            if (potAmount > 0 && !eligible.isEmpty()) {
                sidePots.add(new SidePot(potAmount, eligible));
            }
            prevLevel = level;
        }

        // ===== 分配每个边池 =====
        phase = Phase.FINISHED;
        Map<String, Long> winnings = new HashMap<>();  // playerId -> 总赢得
        players.values().forEach(p -> winnings.put(p.getId(), 0L));

        for (SidePot sp : sidePots) {
            // 在 eligible 中找牌最大的
            String bestPlayer = sp.eligible().stream()
                    .max((a, b) -> {
                        HandResult ha = HandEvaluator.evaluate(players.get(a).getHand());
                        HandResult hb = HandEvaluator.evaluate(players.get(b).getHand());
                        return HandEvaluator.compare(ha, hb);
                    })
                    .orElse(null);
            if (bestPlayer != null) {
                winnings.merge(bestPlayer, sp.amount(), Long::sum);
            }
        }

        // 发放奖金
        String overallWinner = null;
        long maxWin = 0;
        for (var entry : winnings.entrySet()) {
            if (entry.getValue() > 0) {
                players.get(entry.getKey()).setChips(
                        players.get(entry.getKey()).getChips() + entry.getValue());
                if (entry.getValue() > maxWin) {
                    maxWin = entry.getValue();
                    overallWinner = entry.getKey();
                }
            }
        }

        // 构建结果
        buildAndBroadcastResults(overallWinner != null ? overallWinner : contenders.get(0).playerId(), winnings);
    }

    /**
     * 单一赢家（其他人全弃牌）
     */
    private void distributeSingleWinner(String winnerId) {
        phase = Phase.FINISHED;
        cancelTurnTimer();
        PlayerState winner = players.get(winnerId);
        winner.setChips(winner.getChips() + pot);

        Map<String, Long> winnings = new HashMap<>();
        players.values().forEach(p -> winnings.put(p.getId(), 0L));
        winnings.put(winnerId, pot);

        buildAndBroadcastResults(winnerId, winnings);
    }

    /**
     * 构建并广播游戏结果
     */
    private void buildAndBroadcastResults(String mainWinnerId, Map<String, Long> winnings) {
        List<Map<String, Object>> results = new ArrayList<>();
        for (PlayerState p : players.values()) {
            HandResult eval = p.getHand().isEmpty() ? null : HandEvaluator.evaluate(p.getHand());
            long won = winnings.getOrDefault(p.getId(), 0L);
            long profit = won - p.getCurrentRoundBet();
            Map<String, Object> r = new HashMap<>();
            r.put("playerId", p.getId());
            r.put("playerName", p.getName());
            r.put("avatar", p.getAvatar());
            r.put("hand", p.getHand());
            r.put("handType", eval != null ? eval.getTypeName() : null);
            r.put("chips", p.getChips());
            r.put("betAmount", p.getCurrentRoundBet());
            r.put("profit", profit);
            r.put("isWinner", won > 0);
            r.put("hasFolded", p.isHasFolded());
            results.add(r);
        }

        PlayerState mainWinner = players.get(mainWinnerId);
        HandResult winEval = mainWinner.getHand().isEmpty() ? null : HandEvaluator.evaluate(mainWinner.getHand());
        Map<String, Object> data = new HashMap<>();
        data.put("winnerId", mainWinnerId);
        data.put("winnerName", mainWinner.getName());
        data.put("winnerAvatar", mainWinner.getAvatar());
        data.put("winnerHand", mainWinner.getHand());
        data.put("winnerHandType", winEval != null ? winEval.getTypeName() : null);
        data.put("pot", pot);
        data.put("results", results);

        broadcast("game_over", data);
    }

    private void declareWinner(String winnerId,
            List<?> contenders) {
        distributeSingleWinner(winnerId);
    }

    private void startTurnTimer() {
        cancelTurnTimer();
        String timeoutPlayer = turnOrder.isEmpty() ? null : turnOrder.get(currentPlayerIndex);
        if (timeoutPlayer == null)
            return;
        turnTimer = scheduler.schedule(() -> {
            try {
                playerAction(timeoutPlayer, "fold", 0);
            } catch (Exception e) {
                log.debug("超时弃牌失败: {}", e.getMessage());
            }
        }, TURN_TIMEOUT_SECS, TimeUnit.SECONDS);
    }

    private void cancelTurnTimer() {
        if (turnTimer != null) {
            turnTimer.cancel(false);
            turnTimer = null;
        }
    }

    // ===== 消息广播 =====

    private void broadcast(String event, Map<String, Object> data) {
        if (eventCallback != null) {
            eventCallback.accept(null, new RoomEvent(id, event, data, null));
        }
    }

    private void notifyPlayer(String playerId, String event, Map<String, Object> data) {
        if (eventCallback != null) {
            eventCallback.accept(null, new RoomEvent(id, event, data, playerId));
        }
    }

    public void setEventCallback(BiConsumer<String, RoomEvent> callback) {
        this.eventCallback = callback;
    }

    // ===== Getters =====
    public String getId() {
        return id;
    }

    public String getRoomType() {
        return roomType;
    }

    public long getAnte() {
        return ante;
    }

    public int getMaxPlayers() {
        return maxPlayers;
    }

    public Phase getPhase() {
        return phase;
    }

    public long getPot() {
        return pot;
    }

    public Map<String, PlayerState> getPlayers() {
        return players;
    }

    public List<String> getTurnOrder() {
        return turnOrder;
    }

    public int getCurrentPlayerIndex() {
        return currentPlayerIndex;
    }

    /** 房间事件封装 */
    public record RoomEvent(String roomId, String event,
            Map<String, Object> data, String targetPlayerId) {
    }
}
