package com.pokethree.game;

/**
 * 炸金花牌型枚举（从大到小）
 */
public enum HandType {

    HIGH_CARD(1, "高牌"),
    PAIR(2, "对子"),
    STRAIGHT(3, "顺子"),
    FLUSH(4, "同花"),
    STRAIGHT_FLUSH(5, "同花顺"),
    THREE_OF_KIND(6, "豹子");

    private final int rank;
    private final String displayName;

    HandType(int rank, String displayName) {
        this.rank = rank;
        this.displayName = displayName;
    }

    public int getRank() { return rank; }
    public String getDisplayName() { return displayName; }
}
