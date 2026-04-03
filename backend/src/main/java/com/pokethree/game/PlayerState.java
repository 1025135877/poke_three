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
    private String gender = "F";
    private boolean isAI;

    // 本局状态
    private List<Card> hand = List.of();
    private boolean hasLooked = false;
    private boolean hasFolded = false;
    private boolean isAllIn = false;
    private boolean isReady = false;
    private boolean disconnected = false;
    private long currentRoundBet = 0;

    // 本局道具配额（开局时从DB同步）
    private int xrayCards = 0;
    private int swapCards = 0;
    // 单局限用标记
    private boolean usedXrayThisRound = false;
    private boolean usedSwapThisRound = false;

    public static PlayerState of(String id, String name, String avatar, long chips, boolean isAI) {
        return of(id, name, avatar, chips, isAI, "F");
    }

    public static PlayerState of(String id, String name, String avatar, long chips, boolean isAI, String gender) {
        PlayerState ps = new PlayerState();
        ps.id = id;
        ps.name = name;
        ps.avatar = avatar != null ? avatar : "";
        ps.chips = chips;
        ps.isAI = isAI;
        return ps;
    }
}
