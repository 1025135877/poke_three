package com.pokethree.service;

import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.pokethree.entity.GameRecord;
import com.pokethree.entity.Player;
import com.pokethree.game.PlayerState;
import com.pokethree.mapper.GameRecordMapper;
import com.pokethree.mapper.PlayerMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 游戏 Service — 负责玩家数据持久化和对局记录
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GameService {

    private final PlayerMapper playerMapper;
    private final GameRecordMapper gameRecordMapper;

    /**
     * 获取或创建玩家（首次登录时自动注册）
     */
    public PlayerState getOrCreatePlayer(String playerId, String name, long defaultChips) {
        Player player = playerMapper.selectById(playerId);

        if (player == null) {
            player = new Player()
                    .setId(playerId.startsWith("player_") ? playerId : "player_" + UUID.randomUUID().toString().substring(0, 8))
                    .setName(name)
                    .setAvatar("")
                    .setChips(defaultChips)
                    .setDiamonds(520)
                    .setTotalGames(0)
                    .setWinGames(0)
                    .setMaxWin(0L)
                    .setCreatedAt(LocalDateTime.now())
                    .setUpdatedAt(LocalDateTime.now());
            playerMapper.insert(player);
            log.info("新玩家注册: {} ({})", name, player.getId());
        }

        return PlayerState.of(player.getId(), player.getName(), player.getAvatar(), player.getChips(), false);
    }

    /**
     * 保存对局结果
     */
    @Transactional
    public void saveGameRecords(String roomId, String roomType, List<Map<String, Object>> results) {
        for (Map<String, Object> r : results) {
            String playerId = (String) r.get("playerId");
            Player player = playerMapper.selectById(playerId);

            // 跳过 AI 玩家
            if (player == null) continue;

            Boolean isWinner = Boolean.TRUE.equals(r.get("isWinner"));
            long profit = r.get("profit") instanceof Number n ? n.longValue() : 0;
            long betAmount = r.get("betAmount") instanceof Number n ? n.longValue() : 0;

            // 更新玩家统计和筹码
            long newChips = player.getChips() + profit;
            LambdaUpdateWrapper<Player> uw = new LambdaUpdateWrapper<Player>()
                    .eq(Player::getId, playerId)
                    .set(Player::getChips, Math.max(newChips, 100))
                    .set(Player::getTotalGames, player.getTotalGames() + 1)
                    .set(Player::getWinGames, player.getWinGames() + (isWinner ? 1 : 0))
                    .set(Player::getMaxWin, isWinner ? Math.max(player.getMaxWin(), profit) : player.getMaxWin())
                    .set(Player::getUpdatedAt, LocalDateTime.now());
            playerMapper.update(null, uw);

            // 保存对局记录
            GameRecord record = new GameRecord()
                    .setRoomId(roomId)
                    .setRoomType(roomType)
                    .setPlayerId(playerId)
                    .setPlayerName(player.getName())
                    .setHandType((String) r.get("handType"))
                    .setBetAmount(betAmount)
                    .setProfit(profit)
                    .setIsWinner(isWinner)
                    .setPlayedAt(LocalDateTime.now());
            gameRecordMapper.insert(record);
        }
    }

    /**
     * 获取排行榜
     */
    public List<Map<String, Object>> getLeaderboard(int limit) {
        return gameRecordMapper.selectLeaderboard(limit);
    }
}
