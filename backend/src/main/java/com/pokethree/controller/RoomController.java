package com.pokethree.controller;

import com.pokethree.game.RoomManager;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * 基础 REST 接口
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RoomController {

    private final RoomManager roomManager;

    /** 健康检查 */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "ok",
                "time", LocalDateTime.now().toString(),
                "service", "欢乐三张 Java 后端"
        ));
    }

    /** 房间类型列表 */
    @GetMapping("/room-types")
    public ResponseEntity<?> roomTypes() {
        return ResponseEntity.ok(RoomManager.ROOM_TYPES.entrySet().stream()
                .map(e -> Map.of(
                        "key", e.getKey(),
                        "name", e.getValue().name(),
                        "ante", e.getValue().ante(),
                        "minChips", e.getValue().minChips(),
                        "description", e.getValue().description()
                )).toList());
    }

    /** 当前房间列表 */
    @GetMapping("/rooms")
    public ResponseEntity<?> rooms() {
        return ResponseEntity.ok(roomManager.getRoomList());
    }

    /** 排行榜（静态模拟） */
    @GetMapping("/leaderboard")
    public ResponseEntity<?> leaderboard() {
        return ResponseEntity.ok(Map.of(
                "leaderboard", java.util.List.of(
                        Map.of("rank",1,"name","财神到","chips",48200000,"winRate",75.2),
                        Map.of("rank",2,"name","林大侠","chips",12500000,"winRate",69.8),
                        Map.of("rank",3,"name","欢欢姐","chips",8900000,"winRate",72.1),
                        Map.of("rank",4,"name","熊猫大侠","chips",5200000,"winRate",68.0),
                        Map.of("rank",5,"name","老虎不吃鱼","chips",4800000,"winRate",62.0),
                        Map.of("rank",6,"name","灵狐儿","chips",4100000,"winRate",71.0)
                ),
                "totalPot", 888500000,
                "activeUsers", roomManager.getRoomList().size() * 3
        ));
    }

    /** 商店商品 */
    @GetMapping("/shop")
    public ResponseEntity<?> shop() {
        return ResponseEntity.ok(Map.of(
                "coins", java.util.List.of(
                        Map.of("id","c1","name","一袋金币","amount",100000,"price",2.00),
                        Map.of("id","c2","name","一罐金币","amount",500000,"price",10.00),
                        Map.of("id","c3","name","一箱金币","amount",1500000,"price",28.00,"tag","超值"),
                        Map.of("id","c4","name","超级大金库","amount",10000000,"price",168.00)
                )
        ));
    }
}
