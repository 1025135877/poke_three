package com.pokethree.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pokethree.entity.PlayerItem;
import org.apache.ibatis.annotations.Mapper;

/**
 * 玩家道具 Mapper
 */
@Mapper
public interface PlayerItemMapper extends BaseMapper<PlayerItem> {
}
