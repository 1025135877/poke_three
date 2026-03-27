package com.pokethree.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pokethree.entity.DailyCheckin;
import org.apache.ibatis.annotations.Mapper;

/**
 * 每日签到 Mapper
 */
@Mapper
public interface DailyCheckinMapper extends BaseMapper<DailyCheckin> {
}
