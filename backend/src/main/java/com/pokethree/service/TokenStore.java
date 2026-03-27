package com.pokethree.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.pokethree.entity.Token;
import com.pokethree.mapper.TokenMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 数据库 Token 存储
 * 管理 token <-> playerId 的持久化映射
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TokenStore {

    private final TokenMapper tokenMapper;

    /**
     * 为玩家生成新 token（数据库持久化，旧 token 失效）
     */
    public String createToken(String playerId) {
        // 清除旧 token，保证单用户单 token
        tokenMapper.delete(new LambdaQueryWrapper<Token>().eq(Token::getPlayerId, playerId));

        String tokenStr = UUID.randomUUID().toString().replace("-", "");
        Token tokenEntity = new Token()
                .setToken(tokenStr)
                .setPlayerId(playerId)
                .setCreatedAt(LocalDateTime.now());
        tokenMapper.insert(tokenEntity);

        log.debug("创建并持久化 token: {} -> {}", tokenStr.substring(0, 8) + "...", playerId);
        return tokenStr;
    }

    /**
     * 根据 token 获取 playerId
     * 
     * @return playerId 或 null
     */
    public String getPlayerId(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        Token tokenEntity = tokenMapper.selectById(token);
        if (tokenEntity == null) {
            return null;
        }
        return tokenEntity.getPlayerId();
    }

    /**
     * 移除 token（登出）
     */
    public void removeToken(String token) {
        if (token != null && !token.isBlank()) {
            tokenMapper.deleteById(token);
        }
    }
}
