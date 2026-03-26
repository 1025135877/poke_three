package com.pokethree.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pokethree.entity.GameRecord;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 对局记录 Mapper
 */
@Mapper
public interface GameRecordMapper extends BaseMapper<GameRecord> {

    /**
     * 查询排行榜（按总赢取金币排序）
     */
    @Select("""
        SELECT player_id, player_name,
               SUM(CASE WHEN profit > 0 THEN profit ELSE 0 END) AS total_win,
               SUM(is_winner) AS win_count,
               COUNT(*) AS game_count
        FROM t_game_record
        GROUP BY player_id, player_name
        ORDER BY total_win DESC
        LIMIT #{limit}
        """)
    List<java.util.Map<String, Object>> selectLeaderboard(int limit);
}
