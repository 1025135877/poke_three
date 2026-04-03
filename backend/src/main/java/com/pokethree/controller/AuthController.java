package com.pokethree.controller;

import com.pokethree.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 认证控制器 — 注册、登录、获取当前用户、签到、任务、商城
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * 注册
     * POST /api/auth/register
     * Body: { "name": "xxx", "password": "xxx" }
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        try {
            String name = body.get("name");
            String password = body.get("password");
            String avatar = body.getOrDefault("avatar", "");
            String gender = body.getOrDefault("gender", "F");
            Map<String, Object> result = authService.register(name, password, avatar, gender);
            return ResponseEntity.ok(Map.of("code", 0, "data", result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.ok(Map.of("code", 1, "message", e.getMessage()));
        }
    }

    /**
     * 登录
     * POST /api/auth/login
     * Body: { "name": "xxx", "password": "xxx" }
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        try {
            String name = body.get("name");
            String password = body.get("password");
            Map<String, Object> result = authService.login(name, password);
            return ResponseEntity.ok(Map.of("code", 0, "data", result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.ok(Map.of("code", 1, "message", e.getMessage()));
        }
    }

    /**
     * 获取当前用户信息
     * GET /api/auth/me
     * Header: Authorization: <token>
     */
    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader(value = "Authorization", required = false) String token) {
        if (token == null || token.isBlank()) {
            return ResponseEntity.ok(Map.of("code", 1, "message", "未登录"));
        }
        Map<String, Object> player = authService.getPlayerByToken(token);
        if (player == null) {
            return ResponseEntity.ok(Map.of("code", 1, "message", "token 已过期"));
        }
        return ResponseEntity.ok(Map.of("code", 0, "data", player));
    }

    /**
     * 登出
     * POST /api/auth/logout
     * Header: Authorization: <token>
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader(value = "Authorization", required = false) String token) {
        authService.logout(token);
        return ResponseEntity.ok(Map.of("code", 0, "message", "已登出"));
    }

    /**
     * 获取玩家游戏记录
     * GET /api/auth/records?limit=20
     * Header: Authorization: <token>
     */
    @GetMapping("/records")
    public ResponseEntity<?> records(
            @RequestHeader(value = "Authorization", required = false) String token,
            @RequestParam(defaultValue = "20") int limit) {
        if (token == null || token.isBlank()) {
            return ResponseEntity.ok(Map.of("code", 1, "message", "未登录"));
        }
        String playerId = authService.getPlayerIdByToken(token);
        if (playerId == null) {
            return ResponseEntity.ok(Map.of("code", 1, "message", "token 已过期"));
        }
        var records = authService.getPlayerRecords(playerId, limit);
        return ResponseEntity.ok(Map.of("code", 0, "data", records));
    }

    /**
     * 排行榜
     * GET /api/auth/leaderboard?limit=50
     * Header: Authorization: <token> (可选)
     */
    @GetMapping("/leaderboard")
    public ResponseEntity<?> leaderboard(
            @RequestHeader(value = "Authorization", required = false) String token,
            @RequestParam(defaultValue = "50") int limit) {
        String playerId = null;
        if (token != null && !token.isBlank()) {
            playerId = authService.getPlayerIdByToken(token);
        }
        var result = authService.getLeaderboard(playerId, limit);
        return ResponseEntity.ok(Map.of("code", 0, "data", result));
    }

    // ===================================================================
    // 每日签到
    // ===================================================================

    /**
     * 每日签到
     * POST /api/auth/checkin
     */
    @PostMapping("/checkin")
    public ResponseEntity<?> checkin(@RequestHeader(value = "Authorization", required = false) String token) {
        String playerId = requireAuth(token);
        if (playerId == null) {
            return ResponseEntity.ok(Map.of("code", 1, "message", "未登录"));
        }
        try {
            var result = authService.dailyCheckin(playerId);
            return ResponseEntity.ok(Map.of("code", 0, "data", result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.ok(Map.of("code", 1, "message", e.getMessage()));
        }
    }

    /**
     * 签到状态
     * GET /api/auth/checkin/status
     */
    @GetMapping("/checkin/status")
    public ResponseEntity<?> checkinStatus(@RequestHeader(value = "Authorization", required = false) String token) {
        String playerId = requireAuth(token);
        if (playerId == null) {
            return ResponseEntity.ok(Map.of("code", 1, "message", "未登录"));
        }
        var result = authService.getCheckinStatus(playerId);
        return ResponseEntity.ok(Map.of("code", 0, "data", result));
    }

    // ===================================================================
    // 每日任务
    // ===================================================================

    /**
     * 获取每日任务列表
     * GET /api/auth/tasks
     */
    @GetMapping("/tasks")
    public ResponseEntity<?> tasks(@RequestHeader(value = "Authorization", required = false) String token) {
        String playerId = requireAuth(token);
        if (playerId == null) {
            return ResponseEntity.ok(Map.of("code", 1, "message", "未登录"));
        }
        var result = authService.getDailyTasks(playerId);
        return ResponseEntity.ok(Map.of("code", 0, "data", result));
    }

    /**
     * 领取任务奖励
     * POST /api/auth/tasks/claim
     * Body: { "taskType": "play_1" }
     */
    @PostMapping("/tasks/claim")
    public ResponseEntity<?> claimTask(
            @RequestHeader(value = "Authorization", required = false) String token,
            @RequestBody Map<String, String> body) {
        String playerId = requireAuth(token);
        if (playerId == null) {
            return ResponseEntity.ok(Map.of("code", 1, "message", "未登录"));
        }
        try {
            String taskType = body.get("taskType");
            var result = authService.claimTaskReward(playerId, taskType);
            return ResponseEntity.ok(Map.of("code", 0, "data", result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.ok(Map.of("code", 1, "message", e.getMessage()));
        }
    }

    // ===================================================================
    // 商城购买
    // ===================================================================

    /**
     * 商城购买
     * POST /api/auth/shop/purchase
     * Body: { "itemId": "coins_100k" }
     */
    @PostMapping("/shop/purchase")
    public ResponseEntity<?> purchase(
            @RequestHeader(value = "Authorization", required = false) String token,
            @RequestBody Map<String, String> body) {
        String playerId = requireAuth(token);
        if (playerId == null) {
            return ResponseEntity.ok(Map.of("code", 1, "message", "未登录"));
        }
        try {
            String itemId = body.get("itemId");
            var result = authService.purchaseItem(playerId, itemId);
            return ResponseEntity.ok(Map.of("code", 0, "data", result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.ok(Map.of("code", 1, "message", e.getMessage()));
        }
    }

    // ===================================================================
    // 道具背包
    // ===================================================================

    /**
     * 获取玩家道具列表
     * GET /api/auth/items
     */
    @GetMapping("/items")
    public ResponseEntity<?> items(@RequestHeader(value = "Authorization", required = false) String token) {
        String playerId = requireAuth(token);
        if (playerId == null) {
            return ResponseEntity.ok(Map.of("code", 1, "message", "未登录"));
        }
        var items = authService.getPlayerItems(playerId);
        return ResponseEntity.ok(Map.of("code", 0, "data", items));
    }

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

    // ===== 辅助 =====

    private String requireAuth(String token) {
        if (token == null || token.isBlank())
            return null;
        return authService.getPlayerIdByToken(token);
    }
}
