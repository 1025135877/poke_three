package com.pokethree.game;

import java.util.Comparator;
import java.util.List;

/**
 * 炸金花牌型判断与比较
 *
 * 牌型大小（从大到小）：
 * 6 豹子（三条）> 5 同花顺 > 4 同花 > 3 顺子 > 2 对子 > 1 高牌
 *
 * 特殊规则：A-2-3 是最小的顺子
 */
public class HandEvaluator {

    /**
     * 评估三张手牌的牌型
     */
    public static HandResult evaluate(List<Card> cards) {
        if (cards == null || cards.size() != 3) {
            throw new IllegalArgumentException("必须提供恰好三张牌");
        }

        // 按点数从大到小排序
        List<Card> sorted = cards.stream()
                .sorted(Comparator.comparingInt(Card::getValue).reversed())
                .toList();

        int v0 = sorted.get(0).getValue();
        int v1 = sorted.get(1).getValue();
        int v2 = sorted.get(2).getValue();

        boolean isFlush    = isFlush(sorted);
        boolean isStraight = isStraight(v0, v1, v2);
        boolean isThreeOfKind = (v0 == v1 && v1 == v2);

        if (isThreeOfKind) {
            return new HandResult(HandType.THREE_OF_KIND, sorted, v0, null);
        }
        if (isFlush && isStraight) {
            return new HandResult(HandType.STRAIGHT_FLUSH, sorted, straightRank(v0, v1, v2), null);
        }
        if (isFlush) {
            return new HandResult(HandType.FLUSH, sorted, v0, new int[]{v0, v1, v2});
        }
        if (isStraight) {
            return new HandResult(HandType.STRAIGHT, sorted, straightRank(v0, v1, v2), null);
        }

        // 判断对子
        if (v0 == v1) return new HandResult(HandType.PAIR, sorted, v0 * 100 + v2, null);
        if (v1 == v2) return new HandResult(HandType.PAIR, sorted, v1 * 100 + v0, null);
        if (v0 == v2) return new HandResult(HandType.PAIR, sorted, v0 * 100 + v1, null);

        return new HandResult(HandType.HIGH_CARD, sorted, v0, new int[]{v0, v1, v2});
    }

    /**
     * 比较两手牌
     * @return 正数: handA 大，负数: handB 大，0: 相等
     */
    public static int compare(HandResult handA, HandResult handB) {
        int typeDiff = handA.getType().getRank() - handB.getType().getRank();
        if (typeDiff != 0) return typeDiff;

        // 同牌型比较
        return switch (handA.getType()) {
            case THREE_OF_KIND, STRAIGHT_FLUSH, STRAIGHT ->
                    handA.getPrimaryRank() - handB.getPrimaryRank();
            case FLUSH, HIGH_CARD ->
                    compareArrays(handA.getSortedValues(), handB.getSortedValues());
            case PAIR ->
                    handA.getPrimaryRank() - handB.getPrimaryRank();
        };
    }

    // ===== 内部辅助方法 =====

    private static boolean isFlush(List<Card> cards) {
        String suit = cards.get(0).getSuit();
        return cards.stream().allMatch(c -> suit.equals(c.getSuit()));
    }

    private static boolean isStraight(int v0, int v1, int v2) {
        // 常规顺子
        if (v0 - v1 == 1 && v1 - v2 == 1) return true;
        // A-2-3 特殊顺子
        return v0 == 14 && v1 == 3 && v2 == 2;
    }

    /** 顺子比较值：A-2-3 视为最小顺子（rank=3） */
    private static int straightRank(int v0, int v1, int v2) {
        if (v0 == 14 && v1 == 3 && v2 == 2) return 3;
        return v0;
    }

    private static int compareArrays(int[] a, int[] b) {
        for (int i = 0; i < Math.min(a.length, b.length); i++) {
            if (a[i] != b[i]) return a[i] - b[i];
        }
        return 0;
    }
}
