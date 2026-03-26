package com.pokethree.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 内存 Token 存储
 * 管理 token <-> playerId 的映射
 */
@Slf4j
@Component
public class TokenStore {

    /** token -> playerId */
    private final Map<String, String> tokenToPlayer = new ConcurrentHashMap<>();
    /** playerId -> token（保证单 token） */
    private final Map<String, String> playerToToken = new ConcurrentHashMap<>();

    /**
     * 为玩家生成新 token（旧 token 失效）
     */
    public String createToken(String playerId) {
        // 清除旧 token
        String oldToken = playerToToken.remove(playerId);
        if (oldToken != null) {
            tokenToPlayer.remove(oldToken);
        }

        String token = UUID.randomUUID().toString().replace("-", "");
        tokenToPlayer.put(token, playerId);
        playerToToken.put(playerId, token);
        log.debug("创建 token: {} -> {}", token.substring(0, 8) + "...", playerId);
        return token;
    }

    /**
     * 根据 token 获取 playerId
     * 
     * @return playerId 或 null
     */
    public String getPlayerId(String token) {
        if (token == null || token.isBlank())
            return null;
        return tokenToPlayer.get(token);
    }

    /**
     * 移除 token（登出）
     */
    public void removeToken(String token) {
        String playerId = tokenToPlayer.remove(token);
        if (playerId != null) {
            playerToToken.remove(playerId);
        }
    }
}
