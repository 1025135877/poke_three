package com.pokethree.game;

import lombok.Data;
import lombok.experimental.Accessors;

import java.util.List;

/**
 * 房间内玩家状态
 */
@Data
@Accessors(chain = true)
public class PlayerState {

    private String id;
    private String name;
    private String avatar;
    private long chips;
    private boolean isAI;

    // 本局状态
    private List<Card> hand = List.of();
    private boolean hasLooked = false;
    private boolean hasFolded = false;
    private boolean isAllIn = false;
    private boolean isReady = false;
    private long currentRoundBet = 0;

    public static PlayerState of(String id, String name, String avatar, long chips, boolean isAI) {
        PlayerState ps = new PlayerState();
        ps.id = id;
        ps.name = name;
        ps.avatar = avatar != null ? avatar : "";
        ps.chips = chips;
        ps.isAI = isAI;
        return ps;
    }
}
