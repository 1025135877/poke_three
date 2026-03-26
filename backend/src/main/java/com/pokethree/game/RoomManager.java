package com.pokethree.game;

import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 房间管理器（单例 Spring Bean）
 * 管理所有游戏房间的创建、销毁和玩家匹配
 */
@Component
public class RoomManager {

    /** 房间类型配置 */
    public static final Map<String, RoomConfig> ROOM_TYPES = Map.of(
            "beginner", new RoomConfig("新手场", 100, 1000, 6, "小试牛刀 欢乐无限"),
            "normal", new RoomConfig("普通场", 1000, 10000, 6, "高手过招 见招拆招"),
            "rich", new RoomConfig("富豪场", 10000, 100000, 6, "巅峰对决 一掷千金"));

    /** roomId -> GameRoom */
    private final Map<String, GameRoom> rooms = new ConcurrentHashMap<>();

    /** playerId -> roomId */
    private final Map<String, String> playerRoomMap = new ConcurrentHashMap<>();

    /**
     * 快速匹配
     */
    public GameRoom quickMatch(PlayerState player, String roomType) {
        RoomConfig config = ROOM_TYPES.get(roomType);
        if (config == null)
            throw new IllegalArgumentException("未知房间类型: " + roomType);

        // 寻找有空位且等待中的同类型房间
        GameRoom target = rooms.values().stream()
                .filter(r -> roomType.equals(r.getRoomType())
                        && r.getPhase() == GameRoom.Phase.WAITING
                        && r.getPlayers().size() < r.getMaxPlayers()
                        && !r.getPlayers().containsKey(player.getId()))
                .findFirst()
                .orElseGet(() -> createRoom(roomType));

        target.addPlayer(player);
        playerRoomMap.put(player.getId(), target.getId());
        return target;
    }

    /** 创建房间 */
    public GameRoom createRoom(String roomType) {
        RoomConfig config = ROOM_TYPES.get(roomType);
        if (config == null)
            throw new IllegalArgumentException("未知房间类型: " + roomType);
        String roomId = UUID.randomUUID().toString().substring(0, 8);
        GameRoom room = new GameRoom(roomId, roomType, config.ante(), config.maxPlayers());
        rooms.put(roomId, room);
        return room;
    }

    public GameRoom getRoom(String roomId) {
        return rooms.get(roomId);
    }

    public GameRoom getPlayerRoom(String playerId) {
        String roomId = playerRoomMap.get(playerId);
        if (roomId == null)
            return null;
        return rooms.get(roomId);
    }

    public void leaveRoom(String playerId) {
        String roomId = playerRoomMap.get(playerId);
        if (roomId == null)
            return;
        GameRoom room = rooms.get(roomId);
        if (room != null) {
            room.removePlayer(playerId);
            if (room.getPlayers().isEmpty())
                rooms.remove(roomId);
        }
        playerRoomMap.remove(playerId);
    }

    /**
     * 强制移除玩家与房间的映射关系（不操作房间本身）
     * 用于对局结束后清理已断线玩家
     */
    public void forceRemovePlayerMapping(String playerId) {
        playerRoomMap.remove(playerId);
    }

    public List<Map<String, Object>> getRoomList() {
        return rooms.values().stream().map(r -> {
            Map<String, Object> m = new HashMap<>();
            m.put("roomId", r.getId());
            m.put("roomType", r.getRoomType());
            m.put("typeName", ROOM_TYPES.get(r.getRoomType()) != null
                    ? ROOM_TYPES.get(r.getRoomType()).name()
                    : r.getRoomType());
            m.put("phase", r.getPhase().name().toLowerCase());
            m.put("playerCount", r.getPlayers().size());
            m.put("maxPlayers", r.getMaxPlayers());
            m.put("pot", r.getPot());
            m.put("ante", r.getAnte());
            return m;
        }).toList();
    }

    /** 房间配置记录 */
    public record RoomConfig(String name, long ante, long minChips, int maxPlayers, String description) {
    }
}
