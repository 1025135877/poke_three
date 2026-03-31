package com.pokethree.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.experimental.Accessors;

/**
 * 玩家道具持有记录
 * 每种道具类型对应一条记录，通过 quantity 追踪数量
 */
@Data
@Accessors(chain = true)
@TableName("t_player_item")
public class PlayerItem {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 关联玩家ID */
    private String playerId;

    /** 道具类型：xray_card / swap_card */
    private String itemType;

    /** 持有数量 */
    private Integer quantity;

    private String updatedAt;
}
