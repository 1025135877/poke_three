package com.pokethree.game;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

/**
 * 扑克牌
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Card {

    /** 花色: hearts/diamonds/clubs/spades */
    private String suit;

    /** 点数: 2-14（14=A） */
    private int value;

    /** 展示文字: 2-10, J, Q, K, A */
    private String display;

    /** 花色符号 */
    private String symbol;

    /** 花色中文名 */
    private String suitName;

    /** 唯一标识 */
    private String id;

    public static Card of(String suit, int value) {
        String display = switch (value) {
            case 11 -> "J";
            case 12 -> "Q";
            case 13 -> "K";
            case 14 -> "A";
            default -> String.valueOf(value);
        };
        String symbol = switch (suit) {
            case "hearts"   -> "♥";
            case "diamonds" -> "♦";
            case "clubs"    -> "♣";
            case "spades"   -> "♠";
            default -> "?";
        };
        String suitName = switch (suit) {
            case "hearts"   -> "红桃";
            case "diamonds" -> "方块";
            case "clubs"    -> "梅花";
            case "spades"   -> "黑桃";
            default -> suit;
        };
        return new Card(suit, value, display, symbol, suitName, suit + "_" + value);
    }
}
