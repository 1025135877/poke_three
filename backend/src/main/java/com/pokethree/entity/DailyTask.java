package com.pokethree.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.experimental.Accessors;

/**
 * 每日任务记录实体
 */
@Data
@Accessors(chain = true)
@TableName("t_daily_task")
public class DailyTask {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 玩家ID */
    private String playerId;

    /** 任务日期 yyyy-MM-dd */
    private String taskDate;

    /** 任务类型：checkin, play_1, play_3, win_1, ai_play */
    private String taskType;

    /** 当前进度（如对战局数） */
    private Integer progress;

    /** 是否已完成 */
    private Integer isCompleted;

    /** 是否已领取奖励 */
    private Integer isClaimed;

    private String createdAt;
}
