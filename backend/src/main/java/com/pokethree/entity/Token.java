package com.pokethree.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.experimental.Accessors;

import java.time.LocalDateTime;

/**
 * Token 存储实体
 */
@Data
@Accessors(chain = true)
@TableName("t_token")
public class Token {

    @TableId
    private String token;

    /** 玩家 ID (唯一，保证单用户单 token) */
    private String playerId;

    private LocalDateTime createdAt;
}
