package com.pokethree.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.experimental.Accessors;

import java.time.LocalDateTime;

/**
 * 对局记录实体
 */
@Data
@Accessors(chain = true)
@TableName("t_game_record")
public class GameRecord {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 房间ID */
    private String roomId;

    /** 房间类型 */
    private String roomType;

    /** 玩家ID */
    private String playerId;

    /** 玩家昵称 */
    private String playerName;

    /** 手牌 JSON */
    private String handCards;

    /** 牌型 */
    private String handType;

    /** 本局总下注 */
    private Long betAmount;

    /** 盈亏（正为赢） */
    private Long profit;

    /** 是否赢家 */
    private Boolean isWinner;

    private LocalDateTime playedAt;
}
