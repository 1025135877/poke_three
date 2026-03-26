package com.pokethree.game;

import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.Random;
import java.util.UUID;

/**
 * AI 玩家 — 基于牌型强度的简单策略
 */
@Slf4j
public class AIPlayer {

    private static final String[] AI_NAMES = {
        "隔壁老王", "牌桌小王子", "欢欢姐", "财神到",
        "熊猫大侠", "老虎不吃鱼", "灵狐儿", "林大侠",
        "金牌赌神", "小幸运", "顺风局", "一夜暴富"
    };

    private static final Random RANDOM = new Random();

    private final String id;
    private final String name;
    private final double aggression;   // 0-1，越高越激进

    public AIPlayer() {
        this.id = "ai_" + UUID.randomUUID().toString().substring(0, 8);
        this.name = AI_NAMES[RANDOM.nextInt(AI_NAMES.length)];
        this.aggression = 0.3 + RANDOM.nextDouble() * 0.5;
    }

    public PlayerState toPlayerState() {
        long chips = 50000 + (long)(RANDOM.nextDouble() * 150000);
        return PlayerState.of(id, name, "ai_avatar", chips, true);
    }

    /**
     * AI 决策
     * @return {action, amount, delayMs}
     */
    public Decision decide(long currentBet, long myChips, boolean hasLooked, List<Card> hand) {
        long delayMs = 1000 + (long)(RANDOM.nextDouble() * 2000);
        HandResult eval = HandEvaluator.evaluate(hand);
        double strength = handStrength(eval);

        String action;
        long amount = 0;

        if (strength >= 0.8) {
            if (RANDOM.nextDouble() < aggression * 0.6) {
                action = "all_in";
            } else {
                action = "raise";
                amount = currentBet * 2;
            }
        } else if (strength >= 0.5) {
            action = RANDOM.nextDouble() < aggression * 0.3 ? "raise" : "call";
            if ("raise".equals(action)) amount = currentBet * 2;
        } else if (strength >= 0.3) {
            action = RANDOM.nextDouble() < 0.6 ? "call" : "fold";
        } else {
            action = RANDOM.nextDouble() < 0.25 ? "call" : "fold";
        }

        // 筹码不足检查
        if ("call".equals(action) || "raise".equals(action)) {
            long need = "raise".equals(action) ? (amount > 0 ? amount : currentBet * 2) : currentBet;
            if (myChips < need) {
                action = strength >= 0.4 ? "all_in" : "fold";
            }
        }

        return new Decision(action, amount, delayMs);
    }

    public boolean shouldLook(int round) {
        double prob = 0.4 + Math.min(round / 5.0, 0.5);
        return RANDOM.nextDouble() < prob;
    }

    private double handStrength(HandResult r) {
        return switch (r.getType()) {
            case THREE_OF_KIND    -> 0.95 + r.getPrimaryRank() / 14.0 * 0.05;
            case STRAIGHT_FLUSH  -> 0.85 + r.getPrimaryRank() / 14.0 * 0.1;
            case FLUSH           -> 0.65 + (r.getSortedValues()[0] / 14.0) * 0.15;
            case STRAIGHT        -> 0.55 + r.getPrimaryRank() / 14.0 * 0.1;
            case PAIR            -> 0.30 + (r.getPrimaryRank() / 100.0 / 14.0) * 0.2;
            case HIGH_CARD       -> r.getSortedValues()[0] / 14.0 * 0.3;
        };
    }

    public String getId() { return id; }
    public String getName() { return name; }

    public record Decision(String action, long amount, long delayMs) {}
}
