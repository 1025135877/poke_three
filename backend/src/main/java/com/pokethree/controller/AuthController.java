package com.pokethree.controller;

import com.pokethree.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 认证控制器 — 注册、登录、获取当前用户
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
            Map<String, Object> result = authService.register(name, password, avatar);
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
     * Header: Authorization: <token> (可选，用于获取自己的排名)
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
}
