package com.pokethree.game;

import lombok.Data;
import lombok.AllArgsConstructor;

import java.util.List;

/**
 * 手牌评估结果
 */
@Data
@AllArgsConstructor
public class HandResult {

    /** 牌型 */
    private HandType type;

    /** 手牌（已排序） */
    private List<Card> cards;

    /**
     * 用于比较大小的主比较值（含义因牌型不同）
     * 豹子/同花顺/顺子 -> 最高牌点数
     * 对子 -> pairValue * 100 + kicker
     * 同花/高牌 -> 多级比较，存入 sortedValues[]
     */
    private int primaryRank;

    /** 次级排序值（同花/高牌用） */
    private int[] sortedValues;

    public String getTypeName() {
        return type.getDisplayName();
    }
}
