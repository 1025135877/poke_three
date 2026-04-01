package com.pokethree.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.experimental.Accessors;

/**
 * 系统配置实体
 */
@Data
@Accessors(chain = true)
@TableName("t_system_config")
public class SystemConfig {

    @TableId
    private String configKey;

    private String configValue;

    private String updatedAt;
}
