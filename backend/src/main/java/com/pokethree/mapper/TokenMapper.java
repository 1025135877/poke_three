package com.pokethree.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pokethree.entity.Token;
import org.apache.ibatis.annotations.Mapper;

/**
 * Token 数据访问
 */
@Mapper
public interface TokenMapper extends BaseMapper<Token> {
}
