package com.pokethree.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pokethree.entity.Player;
import org.apache.ibatis.annotations.Mapper;

/**
 * 玩家 Mapper
 */
@Mapper
public interface PlayerMapper extends BaseMapper<Player> {
}
