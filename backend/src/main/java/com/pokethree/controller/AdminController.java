package com.pokethree.controller;

import com.pokethree.service.AdminService;
import com.pokethree.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * 管理后台 REST API
 * 路径前缀: /api/admin
 */
@Slf4j
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final AuthService authService;

    /** 简单的 admin token 存储 */
    private static final Set<String> adminTokens = Collections.synchronizedSet(new HashSet<>());

    // ===== 管理员登录 =====

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, String> body) {
        String password = body.getOrDefault("password", "");
        if (!adminService.verifyAdmin(password)) {
            return Map.of("code", 1, "message", "密码错误");
        }
        String token = "admin_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        adminTokens.add(token);
        log.info("管理员登录成功");
        return Map.of("code", 0, "token", token);
    }

    // ===== 用户管理 =====

    @GetMapping("/users")
    public Map<String, Object> listUsers(
            @RequestHeader("Admin-Token") String token,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false) String keyword) {
        requireAdmin(token);
        return Map.of("code", 0, "data", adminService.listUsers(page, size, status, keyword));
    }

    @PostMapping("/users/{id}/approve")
    public Map<String, Object> approveUser(
            @RequestHeader("Admin-Token") String token,
            @PathVariable String id) {
        requireAdmin(token);
        adminService.approveUser(id);
        return Map.of("code", 0, "message", "已通过审批");
    }

    @PostMapping("/users/{id}/status")
    public Map<String, Object> setUserStatus(
            @RequestHeader("Admin-Token") String token,
            @PathVariable String id,
            @RequestBody Map<String, Object> body) {
        requireAdmin(token);
        int status = ((Number) body.get("status")).intValue();
        adminService.setUserStatus(id, status);
        return Map.of("code", 0, "message", "状态已更新");
    }

    @PostMapping("/users/{id}/edit")
    public Map<String, Object> editUser(
            @RequestHeader("Admin-Token") String token,
            @PathVariable String id,
            @RequestBody Map<String, Object> body) {
        requireAdmin(token);
        Long chips = body.containsKey("chips") ? ((Number) body.get("chips")).longValue() : null;
        Integer diamonds = body.containsKey("diamonds") ? ((Number) body.get("diamonds")).intValue() : null;
        adminService.editUser(id, chips, diamonds);
        return Map.of("code", 0, "message", "用户信息已更新");
    }

    // ===== 道具管理 =====

    @GetMapping("/items")
    public Map<String, Object> listItems(@RequestHeader("Admin-Token") String token) {
        requireAdmin(token);
        return Map.of("code", 0, "data", adminService.getShopItems(authService.getShopItems()));
    }

    @PostMapping("/items/{itemId}/toggle")
    public Map<String, Object> toggleItem(
            @RequestHeader("Admin-Token") String token,
            @PathVariable String itemId,
            @RequestBody Map<String, Object> body) {
        requireAdmin(token);
        boolean enabled = Boolean.TRUE.equals(body.get("enabled"));
        adminService.toggleShopItem(itemId, enabled);
        return Map.of("code", 0, "message", enabled ? "已上架" : "已下架");
    }

    // ===== 系统配置 =====

    @GetMapping("/config")
    public Map<String, Object> getConfig(@RequestHeader("Admin-Token") String token) {
        requireAdmin(token);
        return Map.of("code", 0, "data", adminService.getAllConfig());
    }

    @PostMapping("/config")
    public Map<String, Object> updateConfig(
            @RequestHeader("Admin-Token") String token,
            @RequestBody Map<String, String> configs) {
        requireAdmin(token);
        adminService.updateConfig(configs);
        return Map.of("code", 0, "message", "配置已更新");
    }

    // ===== 鉴权 =====

    private void requireAdmin(String token) {
        if (token == null || !adminTokens.contains(token)) {
            throw new IllegalStateException("未授权的访问");
        }
    }
}
