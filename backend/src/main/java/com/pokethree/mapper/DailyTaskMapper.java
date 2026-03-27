package com.pokethree.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pokethree.entity.DailyTask;
import org.apache.ibatis.annotations.Mapper;

/**
 * 每日任务 Mapper
 */
@Mapper
public interface DailyTaskMapper extends BaseMapper<DailyTask> {
}
