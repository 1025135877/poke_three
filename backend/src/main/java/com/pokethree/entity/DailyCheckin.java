package com.pokethree.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.experimental.Accessors;

/**
 * 每日签到记录实体
 */
@Data
@Accessors(chain = true)
@TableName("t_daily_checkin")
public class DailyCheckin {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 玩家ID */
    private String playerId;

    /** 签到日期 yyyy-MM-dd */
    private String checkinDate;

    /** 连续签到天数 */
    private Integer dayCount;

    /** 奖励金币数 */
    private Integer rewardChips;

    private String createdAt;
}
