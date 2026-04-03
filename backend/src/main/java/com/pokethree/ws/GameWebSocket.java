package com.pokethree.ws;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pokethree.game.*;
import com.pokethree.service.AuthService;
import com.pokethree.service.GameService;
import com.pokethree.service.ItemService;
import com.pokethree.service.TokenStore;
import jakarta.websocket.*;
import jakarta.websocket.server.ServerEndpoint;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

/**
 * WebSocket 游戏端点
 * 路径：/ws
 * 与原 Node.js wsHandler 保持完全相同的消息协议
 */
@Slf4j
@Component
@ServerEndpoint("/ws")
public class GameWebSocket {

    // Spring WebSocket 端点无法直接注入, 用静态变量
    private static RoomManager roomManager;
    private static GameService gameService;
    private static TokenStore tokenStore;
    private static AuthService authService;
    private static ItemService itemService;
    private static final ObjectMapper MAPPER = new ObjectMapper();

    /** sessionId -> Session */
    private static final Map<String, Session> sessions = new ConcurrentHashMap<>();
    /** sessionId -> playerId */
    private static final Map<String, String> sessionPlayerMap = new ConcurrentHashMap<>();
    /** playerId -> sessionId */
    private static final Map<String, String> playerSessionMap = new ConcurrentHashMap<>();
    /** playerId -> PlayerState（未进房间时的基础信息） */
    private static final Map<String, PlayerState> playerInfoMap = new ConcurrentHashMap<>();

    /** 断线超时清理调度器 */
    private static final ScheduledExecutorService cleanupScheduler = Executors.newSingleThreadScheduledExecutor();
    /** playerId -> 超时清理任务 */
    private static final Map<String, ScheduledFuture<?>> disconnectTimers = new ConcurrentHashMap<>();
    /** 断线保留时间（秒） */
    private static final int DISCONNECT_TIMEOUT_SECONDS = 60;

    /** 同局道具使用记录（key = playerId:roomId:itemType），游戏结束后清理 */
    private static final Set<String> usedItemsPerGame = ConcurrentHashMap.newKeySet();

    @Autowired
    public void setRoomManager(RoomManager rm) {
        GameWebSocket.roomManager = rm;
    }

    @Autowired
    public void setGameService(GameService gs) {
        GameWebSocket.gameService = gs;
    }

    @Autowired
    public void setTokenStore(TokenStore ts) {
        GameWebSocket.tokenStore = ts;
    }

    @Autowired
    public void setAuthService(AuthService as) {
        GameWebSocket.authService = as;
    }

    @Autowired
    public void setItemService(ItemService is) {
        GameWebSocket.itemService = is;
    }

    // ===== 生命周期 =====

    @OnOpen
    public void onOpen(Session session) {
        sessions.put(session.getId(), session);
        log.info("新连接: {}", session.getId());
    }

    @OnMessage
    public void onMessage(String raw, Session session) {
        try {
            Map<?, ?> msg = MAPPER.readValue(raw, Map.class);
            String type = (String) msg.get("type");
            Map<?, ?> data = msg.get("data") instanceof Map<?, ?> d ? d : Map.of();
            handleMessage(session, type, data);
        } catch (Exception e) {
            sendToSession(session, "error", Map.of("message", e.getMessage()));
        }
    }

    @OnClose
    public void onClose(Session session) {
        String playerId = sessionPlayerMap.remove(session.getId());
        if (playerId != null) {
            playerSessionMap.remove(playerId);
            // 启动断线超时清理任务
            scheduleDisconnectCleanup(playerId);
            log.info("玩家断线，{}秒后未重连将移出房间: {} (session={})", DISCONNECT_TIMEOUT_SECONDS, playerId, session.getId());
        }
        sessions.remove(session.getId());
        log.info("断开连接: {}", session.getId());
    }

    @OnError
    public void onError(Session session, Throwable t) {
        log.error("WebSocket 错误 [{}]: {}", session.getId(), t.getMessage());
    }

    // ===== 消息分发 =====

    private void handleMessage(Session session, String type, Map<?, ?> data) {
        String playerId = sessionPlayerMap.get(session.getId());

        switch (type) {
            case "login" -> {
                // 支持 token 登录（优先）和兼容旧的 name/chips 登录
                String token = data.get("token") instanceof String s ? s : null;
                PlayerState ps;

                if (token != null && !token.isBlank()) {
                    // token 认证模式
                    String pid = tokenStore.getPlayerId(token);
                    if (pid == null) {
                        sendToSession(session, "error", Map.of("message", "token 已过期，请重新登录"));
                        return;
                    }
                    ps = gameService.getOrCreatePlayer(pid, null, 888230L);
                } else {
                    // 兼容旧模式（name/chips）
                    String pid = data.get("playerId") != null
                            ? (String) data.get("playerId")
                            : "player_" + UUID.randomUUID().toString().substring(0, 8);
                    String name = data.get("name") != null ? (String) data.get("name")
                            : "玩家" + pid.substring(pid.length() - 4);
                    long chips = data.get("chips") instanceof Number n ? n.longValue() : 888230L;
                    ps = gameService.getOrCreatePlayer(pid, name, chips);
                }

                sessionPlayerMap.put(session.getId(), ps.getId());
                playerSessionMap.put(ps.getId(), session.getId());
                playerInfoMap.put(ps.getId(), ps);

                // 取消断线超时清理任务（玩家已重连）
                cancelDisconnectCleanup(ps.getId());

                // 检测是否有未完成的房间（断线重连）
                GameRoom existingRoom = roomManager.getPlayerRoom(ps.getId());
                if (existingRoom != null) {
                    // 确保回调已注册
                    setupRoomCallback(existingRoom);
                    log.info("玩家重连恢复房间: {} -> room {}", ps.getId(), existingRoom.getId());
                    sendToSession(session, "reconnected", Map.of(
                            "roomId", existingRoom.getId(),
                            "roomType", existingRoom.getRoomType(),
                            "state", existingRoom.getState(ps.getId())));
                } else {
                    sendToSession(session, "login_success", Map.of(
                            "playerId", ps.getId(), "name", ps.getName(),
                            "chips", ps.getChips(), "avatar", ps.getAvatar()));
                }
            }

            case "quick_match" -> {
                requireLogin(playerId);
                String roomType = data.get("roomType") instanceof String s ? s : "beginner";
                PlayerState player = playerInfoMap.get(playerId);
                if (player == null) {
                    // 断线重连等场景下 playerInfoMap 可能被清理，从数据库重建
                    player = gameService.getOrCreatePlayer(playerId, null, 888230L);
                    playerInfoMap.put(playerId, player);
                }

                // 金币校验
                RoomManager.RoomConfig config = RoomManager.ROOM_TYPES.get(roomType);
                if (config != null && player.getChips() < config.minChips()) {
                    sendToSession(session, "match_failed", Map.of(
                            "message", "金币不足，至少需要 " + config.minChips() + " 金币"));
                    return;
                }

                // 已在房间中则先离开
                GameRoom existing = roomManager.getPlayerRoom(playerId);
                if (existing != null) {
                    roomManager.leaveRoom(playerId);
                }

                GameRoom room = roomManager.quickMatch(player, roomType);
                setupRoomCallback(room);

                // 同步道具数量到 PlayerState
                syncItemsToPlayer(player);

                sendToSession(session, "room_joined", Map.of(
                        "roomId", room.getId(),
                        "roomType", room.getRoomType(),
                        "state", room.getState(playerId)));

                // 通知房间内其他玩家有新人加入
                broadcastRoomState(room, playerId);
            }

            case "ai_match" -> {
                requireLogin(playerId);
                String roomType = data.get("roomType") instanceof String s ? s : "beginner";
                PlayerState player = playerInfoMap.get(playerId);
                if (player == null) {
                    player = gameService.getOrCreatePlayer(playerId, null, 888230L);
                    playerInfoMap.put(playerId, player);
                }

                // 金币校验
                RoomManager.RoomConfig config = RoomManager.ROOM_TYPES.get(roomType);
                if (config != null && player.getChips() < config.minChips()) {
                    sendToSession(session, "match_failed", Map.of(
                            "message", "金币不足，至少需要 " + config.minChips() + " 金币"));
                    return;
                }

                GameRoom room = roomManager.aiMatch(player, roomType);
                setupRoomCallback(room);

                // 同步道具数量到 PlayerState
                syncItemsToPlayer(player);

                sendToSession(session, "room_joined", Map.of(
                        "roomId", room.getId(),
                        "roomType", room.getRoomType(),
                        "isAIRoom", true,
                        "state", room.getState(playerId)));
            }

            case "player_ready" -> {
                requireLogin(playerId);
                GameRoom room = requireRoom(playerId);
                room.playerReady(playerId);
            }

            case "player_action" -> {
                requireLogin(playerId);
                GameRoom room = requireRoom(playerId);
                String action = (String) data.get("action");
                long amount = data.get("amount") instanceof Number n ? n.longValue() : 0;
                room.playerAction(playerId, action, amount);
            }

            case "look_cards" -> {
                requireLogin(playerId);
                GameRoom room = requireRoom(playerId);
                room.playerAction(playerId, "look", 0);
            }

            case "player_compare" -> {
                requireLogin(playerId);
                GameRoom room = requireRoom(playerId);
                String targetId = (String) data.get("targetId");
                room.playerCompare(playerId, targetId);
            }

            case "leave_room" -> {
                if (playerId != null) {
                    cancelDisconnectCleanup(playerId);
                    roomManager.leaveRoom(playerId);
                    playerInfoMap.remove(playerId);
                }
                sendToSession(session, "room_left", Map.of());
            }

            case "get_state" -> {
                requireLogin(playerId);
                GameRoom room = requireRoom(playerId);
                sendToSession(session, "room_state", room.getState(playerId));
            }

            case "play_again" -> {
                requireLogin(playerId);
                GameRoom room = requireRoom(playerId);
                room.resetForNextGame();
                // 广播房间重置，等待所有真人重新准备
                broadcastRoomState(room, null);
            }

            case "use_xray" -> {
                requireLogin(playerId);
                GameRoom room = requireRoom(playerId);
                String itemKey = playerId + ":" + room.getId() + ":xray";
                if (usedItemsPerGame.contains(itemKey)) {
                    sendToSession(session, "item_error", Map.of("message", "本局已使用过透视卡，每局只能使用一次"));
                    break;
                }
                String targetId = (String) data.get("targetId");
                room.useXrayCard(playerId, targetId);
                // 持久化扣除道具
                itemService.consumeItem(playerId, ItemService.ITEM_XRAY);
                usedItemsPerGame.add(itemKey);
            }

            case "use_swap" -> {
                requireLogin(playerId);
                GameRoom room = requireRoom(playerId);
                String swapKey = playerId + ":" + room.getId() + ":swap";
                if (usedItemsPerGame.contains(swapKey)) {
                    sendToSession(session, "item_error", Map.of("message", "本局已使用过换牌卡，每局只能使用一次"));
                    break;
                }
                int cardIndex = data.get("cardIndex") instanceof Number n ? n.intValue() : -1;
                room.useSwapCard(playerId, cardIndex);
                // 持久化扣除道具
                itemService.consumeItem(playerId, ItemService.ITEM_SWAP);
                usedItemsPerGame.add(swapKey);
            }

            case "ping" -> sendToSession(session, "pong", Map.of("time", System.currentTimeMillis()));

            default -> sendToSession(session, "error", Map.of("message", "未知消息类型: " + type));
        }
    }

    // ===== 房间事件回调 =====

    /** 已设置回调的房间ID */
    private static final java.util.Set<String> roomCallbackSet = ConcurrentHashMap.newKeySet();

    private void setupRoomCallback(GameRoom room) {
        if (!roomCallbackSet.add(room.getId()))
            return; // 已设置过
        room.setEventCallback((ignored, event) -> {
            String targetId = event.targetPlayerId();
            if (targetId != null) {
                // 私发
                String sid = playerSessionMap.get(targetId);
                Session s = sid != null ? sessions.get(sid) : null;
                if (s != null)
                    sendToSession(s, event.event(), event.data());
            } else {
                // 广播给房间内所有玩家（包括断线玩家，忽略发送失败）
                for (Map.Entry<String, PlayerState> e : room.getPlayers().entrySet()) {
                    String sid = playerSessionMap.get(e.getKey());
                    Session s = sid != null ? sessions.get(sid) : null;
                    if (s != null) {
                        Map<String, Object> payload = new java.util.HashMap<>(event.data());
                        payload.put("state", room.getState(e.getKey()));
                        sendToSession(s, event.event(), payload);
                    }
                }
                // 对局结束持久化 + 任务进度更新
                if ("game_over".equals(event.event())) {
                    try {
                        @SuppressWarnings("unchecked")
                        var results = (java.util.List<Map<String, Object>>) event.data().get("results");
                        if (results != null) {
                            gameService.saveGameRecords(room.getId(), room.getRoomType(), results);

                            // 更新每日任务进度
                            boolean isAIRoom = room.getId().startsWith("ai_");
                            for (Map<String, Object> r : results) {
                                String pid = (String) r.get("playerId");
                                if (pid == null || pid.startsWith("ai_"))
                                    continue;

                                // 对战任务
                                try {
                                    authService.updateTaskProgress(pid, "play_1");
                                    authService.updateTaskProgress(pid, "play_3"); // play_3 任务需累计3局，进度由
                                                                                   // updateTaskProgress 自动跟踪

                                    // 获胜任务
                                    if (Boolean.TRUE.equals(r.get("isWinner"))) {
                                        authService.updateTaskProgress(pid, "win_1");
                                    }

                                    // 人机对战任务
                                    if (isAIRoom) {
                                        authService.updateTaskProgress(pid, "ai_play");
                                    }
                                } catch (Exception ex) {
                                    log.warn("更新任务进度失败: {}", ex.getMessage());
                                }
                            }
                        }
                    } catch (Exception e) {
                        log.error("对局记录持久化失败: {}", e.getMessage());
                    }

                    // 对局结束后，清理已断线的玩家（从 playerRoomMap 移除）
                    for (var e : room.getPlayers().entrySet()) {
                        if (e.getValue().isDisconnected()) {
                            roomManager.forceRemovePlayerMapping(e.getKey());
                            playerInfoMap.remove(e.getKey());
                            log.info("对局结束，清理断线玩家映射: {}", e.getKey());
                        }
                    }

                    // 清理该房间的道具使用记录
                    String roomId = room.getId();
                    usedItemsPerGame.removeIf(key -> key.contains(":" + roomId + ":"));
                }
            }
        });
    }

    // ===== 辅助方法 =====

    /** 广播房间状态给所有玩家（excludePlayerId 可为 null 表示全部广播） */
    private void broadcastRoomState(GameRoom room, String excludePlayerId) {
        for (Map.Entry<String, PlayerState> e : room.getPlayers().entrySet()) {
            if (e.getKey().equals(excludePlayerId))
                continue;
            String sid = playerSessionMap.get(e.getKey());
            Session s = sid != null ? sessions.get(sid) : null;
            if (s != null) {
                sendToSession(s, "room_state", room.getState(e.getKey()));
            }
        }
    }

    private void requireLogin(String playerId) {
        if (playerId == null)
            throw new IllegalStateException("请先登录");
    }

    private GameRoom requireRoom(String playerId) {
        GameRoom room = roomManager.getPlayerRoom(playerId);
        if (room == null)
            throw new IllegalStateException("你不在任何房间中");
        return room;
    }

    /** 从 DB 同步道具数量到 PlayerState */
    private void syncItemsToPlayer(PlayerState player) {
        if (player == null || player.isAI())
            return;
        try {
            var items = itemService.getPlayerItems(player.getId());
            player.setXrayCards(items.getOrDefault(ItemService.ITEM_XRAY, 0));
            player.setSwapCards(items.getOrDefault(ItemService.ITEM_SWAP, 0));
        } catch (Exception e) {
            log.warn("同步道具失败: {}", e.getMessage());
        }
    }

    private void sendToSession(Session session, String type, Object data) {
        try {
            String json = MAPPER.writeValueAsString(Map.of("type", type, "data", data));
            synchronized (session) {
                if (session.isOpen())
                    session.getBasicRemote().sendText(json);
            }
        } catch (IOException e) {
            log.warn("发送消息失败: {}", e.getMessage());
        }
    }

    // ===== 断线超时清理 =====

    /**
     * 启动断线超时清理任务
     */
    private static void scheduleDisconnectCleanup(String playerId) {
        // 如果已有计时器先取消
        cancelDisconnectCleanup(playerId);
        ScheduledFuture<?> future = cleanupScheduler.schedule(
                () -> cleanupDisconnectedPlayer(playerId),
                DISCONNECT_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        disconnectTimers.put(playerId, future);
    }

    /**
     * 取消断线超时清理任务（玩家已重连）
     */
    private static void cancelDisconnectCleanup(String playerId) {
        ScheduledFuture<?> future = disconnectTimers.remove(playerId);
        if (future != null) {
            future.cancel(false);
            log.info("玩家重连，取消超时清理: {}", playerId);
        }
    }

    /**
     * 执行断线清理：对局中视为弃牌，非对局直接移出房间
     */
    private static void cleanupDisconnectedPlayer(String playerId) {
        disconnectTimers.remove(playerId);
        log.info("断线超时，清理玩家: {}", playerId);

        GameRoom room = roomManager.getPlayerRoom(playerId);

        if (room != null) {
            GameRoom.Phase phase = room.getPhase();
            if (phase == GameRoom.Phase.BETTING || phase == GameRoom.Phase.SHOWDOWN) {
                // 对局进行中：标记弃牌但保留在房间，参与结算
                room.handleDisconnect(playerId);
                log.info("玩家在对局中掉线，已标记弃牌: {}", playerId);
                return;
            }
        }

        // 非对局状态：直接移出房间
        roomManager.leaveRoom(playerId);
        playerInfoMap.remove(playerId);

        // 通知房间内其他在线玩家
        if (room != null && !room.getPlayers().isEmpty()) {
            for (var entry : room.getPlayers().entrySet()) {
                String sid = playerSessionMap.get(entry.getKey());
                Session s = sid != null ? sessions.get(sid) : null;
                if (s != null && s.isOpen()) {
                    try {
                        String json = MAPPER.writeValueAsString(Map.of(
                                "type", "room_state",
                                "data", room.getState(entry.getKey())));
                        synchronized (s) {
                            s.getBasicRemote().sendText(json);
                        }
                    } catch (IOException e) {
                        log.warn("通知玩家失败: {}", e.getMessage());
                    }
                }
            }
        }
    }
}
