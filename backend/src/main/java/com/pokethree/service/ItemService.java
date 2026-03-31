package com.pokethree.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.pokethree.entity.PlayerItem;
import com.pokethree.mapper.PlayerItemMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 道具服务 — 管理玩家道具的增删查
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ItemService {

    private final PlayerItemMapper itemMapper;

    /** 已知道具类型 */
    public static final String ITEM_XRAY = "xray_card";
    public static final String ITEM_SWAP = "swap_card";

    /**
     * 查询玩家某种道具的数量
     */
    public int getItemCount(String playerId, String itemType) {
        PlayerItem item = itemMapper.selectOne(
                new LambdaQueryWrapper<PlayerItem>()
                        .eq(PlayerItem::getPlayerId, playerId)
                        .eq(PlayerItem::getItemType, itemType));
        return item != null ? item.getQuantity() : 0;
    }

    /**
     * 获取玩家所有道具数量
     * 
     * @return { "xray_card": 3, "swap_card": 1 }
     */
    public Map<String, Integer> getPlayerItems(String playerId) {
        List<PlayerItem> items = itemMapper.selectList(
                new LambdaQueryWrapper<PlayerItem>()
                        .eq(PlayerItem::getPlayerId, playerId));
        Map<String, Integer> result = new HashMap<>();
        for (PlayerItem item : items) {
            result.put(item.getItemType(), item.getQuantity());
        }
        return result;
    }

    /**
     * 增加道具数量（upsert：无记录则新建，有记录则累加）
     */
    @Transactional
    public void addItem(String playerId, String itemType, int delta) {
        PlayerItem existing = itemMapper.selectOne(
                new LambdaQueryWrapper<PlayerItem>()
                        .eq(PlayerItem::getPlayerId, playerId)
                        .eq(PlayerItem::getItemType, itemType));

        if (existing == null) {
            PlayerItem item = new PlayerItem()
                    .setPlayerId(playerId)
                    .setItemType(itemType)
                    .setQuantity(delta)
                    .setUpdatedAt(LocalDateTime.now().toString());
            itemMapper.insert(item);
        } else {
            itemMapper.update(null, new LambdaUpdateWrapper<PlayerItem>()
                    .eq(PlayerItem::getId, existing.getId())
                    .set(PlayerItem::getQuantity, existing.getQuantity() + delta)
                    .set(PlayerItem::getUpdatedAt, LocalDateTime.now().toString()));
        }
        log.info("道具变更: playerId={} itemType={} delta={}", playerId, itemType, delta);
    }

    /**
     * 消耗1个道具（余量不足抛异常）
     */
    @Transactional
    public void consumeItem(String playerId, String itemType) {
        PlayerItem item = itemMapper.selectOne(
                new LambdaQueryWrapper<PlayerItem>()
                        .eq(PlayerItem::getPlayerId, playerId)
                        .eq(PlayerItem::getItemType, itemType));

        if (item == null || item.getQuantity() <= 0) {
            throw new IllegalStateException("道具不足: " + itemType);
        }

        itemMapper.update(null, new LambdaUpdateWrapper<PlayerItem>()
                .eq(PlayerItem::getId, item.getId())
                .set(PlayerItem::getQuantity, item.getQuantity() - 1)
                .set(PlayerItem::getUpdatedAt, LocalDateTime.now().toString()));

        log.info("消耗道具: playerId={} itemType={} 剩余={}", playerId, itemType, item.getQuantity() - 1);
    }
}
