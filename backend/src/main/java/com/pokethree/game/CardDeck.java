package com.pokethree.game;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * 扑克牌组 — 52张标准扑克（无大小王）
 */
public class CardDeck {

    private static final String[] SUITS  = {"hearts", "diamonds", "clubs", "spades"};
    private static final int[]    VALUES = {2,3,4,5,6,7,8,9,10,11,12,13,14};

    private final List<Card> cards = new ArrayList<>(52);

    public CardDeck() {
        reset();
    }

    /** 重置为完整52张 */
    public CardDeck reset() {
        cards.clear();
        for (String suit : SUITS) {
            for (int v : VALUES) {
                cards.add(Card.of(suit, v));
            }
        }
        return this;
    }

    /** Fisher-Yates 洗牌 */
    public CardDeck shuffle() {
        Collections.shuffle(cards);
        return this;
    }

    /**
     * 发牌
     * @param count 发牌数
     * @return 发出的牌列表
     */
    public List<Card> deal(int count) {
        if (cards.size() < count) {
            throw new IllegalStateException("牌组中牌数不足，剩余: " + cards.size());
        }
        List<Card> hand = new ArrayList<>(cards.subList(0, count));
        cards.subList(0, count).clear();
        return hand;
    }

    public int remaining() {
        return cards.size();
    }
}
