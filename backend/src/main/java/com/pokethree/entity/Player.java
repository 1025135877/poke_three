package com.pokethree.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.experimental.Accessors;

import java.time.LocalDateTime;

/**
 * 玩家信息实体
 */
@Data
@Accessors(chain = true)
@TableName("t_player")
public class Player {

    @TableId
    private String id;

    /** 昵称 */
    private String name;

    /** 密码哈希 */
    private String password;

    /** 密码盐值 */
    private String salt;

    /** 头像标识 */
    private String avatar;

    /** 金币 */
    private Long chips;

    /** 钻石 */
    private Integer diamonds;

    /** 总局数 */
    private Integer totalGames;

    /** 胜局数 */
    private Integer winGames;

    /** 单局最高获胜 */
    private Long maxWin;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
