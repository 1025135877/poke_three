package com.pokethree.game;

import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.Random;
import java.util.UUID;

/**
 * AI 玩家 — 基于牌型强度 + 策略性格的多元决策
 *
 * 5 种策略性格：
 * - CONSERVATIVE（保守型）：牌差就弃，牌好才跟，极少加注
 * - AGGRESSIVE（激进型）：频繁加注/all-in，制造压力
 * - TRICKY（诡计型）：偶尔用烂牌诈唬加注，好牌装弱跟注
 * - BALANCED（均衡型）：跟注为主，适时加注
 * - RANDOM（随机型）：行为不可预测，增加趣味性
 */
@Slf4j
public class AIPlayer {

    /** AI 策略枚举 */
    public enum Strategy {
        CONSERVATIVE, AGGRESSIVE, TRICKY, BALANCED, RANDOM
    }

    private static final String[] AI_NAMES = {
            "隔壁老王", "牌桌小王子", "欢欢姐", "财神到",
            "熊猫大侠", "老虎不吃鱼", "灵狐儿", "林大侠",
            "金牌赌神", "小幸运", "顺风局", "一夜暴富"
    };

    private static final String[] AI_AVATARS = {
            "ai_king", "ai_queen", "ai_joker", "ai_panda",
            "ai_tiger", "ai_fox", "ai_dragon", "ai_phoenix",
            "ai_lucky", "ai_star", "ai_wind", "ai_gold"
    };

    private static final Random RANDOM_GEN = new Random();

    private final String id;
    private final String name;
    private final String avatar;
    private final Strategy strategy;
    private final double aggression; // 0-1，越高越激进

    /**
     * 使用指定策略创建 AI
     */
    public AIPlayer(Strategy strategy) {
        this.id = "ai_" + UUID.randomUUID().toString().substring(0, 8);
        int nameIdx = RANDOM_GEN.nextInt(AI_NAMES.length);
        this.name = AI_NAMES[nameIdx];
        this.avatar = AI_AVATARS[nameIdx % AI_AVATARS.length];
        this.strategy = strategy;

        // 不同策略的基础激进度
        this.aggression = switch (strategy) {
            case CONSERVATIVE -> 0.15 + RANDOM_GEN.nextDouble() * 0.15;
            case AGGRESSIVE -> 0.65 + RANDOM_GEN.nextDouble() * 0.25;
            case TRICKY -> 0.35 + RANDOM_GEN.nextDouble() * 0.25;
            case BALANCED -> 0.30 + RANDOM_GEN.nextDouble() * 0.20;
            case RANDOM -> RANDOM_GEN.nextDouble() * 0.8;
        };
    }

    /** 向后兼容的无参构造 */
    public AIPlayer() {
        this(Strategy.BALANCED);
    }

    public PlayerState toPlayerState() {
        long chips = 50000 + (long) (RANDOM_GEN.nextDouble() * 150000);
        return PlayerState.of(id, name, avatar, chips, true);
    }

    /**
     * AI 决策
     * 
     * @return {action, amount, delayMs}
     */
    public Decision decide(long currentBet, long myChips, boolean hasLooked, List<Card> hand) {
        long delayMs = 1000 + (long) (RANDOM_GEN.nextDouble() * 2000);
        HandResult eval = HandEvaluator.evaluate(hand);
        double strength = handStrength(eval);

        String action;
        long amount = 0;

        switch (strategy) {
            case CONSERVATIVE -> {
                // 保守型：只有好牌才跟，差牌直接弃
                if (strength >= 0.8) {
                    action = "raise";
                    amount = currentBet * 2;
                } else if (strength >= 0.5) {
                    action = "call";
                } else if (strength >= 0.35) {
                    action = RANDOM_GEN.nextDouble() < 0.4 ? "call" : "fold";
                } else {
                    action = "fold";
                }
            }
            case AGGRESSIVE -> {
                // 激进型：频繁加注，给对手压力
                if (strength >= 0.7) {
                    action = RANDOM_GEN.nextDouble() < 0.5 ? "all_in" : "raise";
                    if ("raise".equals(action))
                        amount = currentBet * 3;
                } else if (strength >= 0.4) {
                    action = RANDOM_GEN.nextDouble() < aggression ? "raise" : "call";
                    if ("raise".equals(action))
                        amount = currentBet * 2;
                } else if (strength >= 0.2) {
                    // 即使牌差也有一定概率加注诈唬
                    double bluffChance = aggression * 0.4;
                    if (RANDOM_GEN.nextDouble() < bluffChance) {
                        action = "raise";
                        amount = currentBet * 2;
                    } else {
                        action = RANDOM_GEN.nextDouble() < 0.5 ? "call" : "fold";
                    }
                } else {
                    action = RANDOM_GEN.nextDouble() < 0.3 ? "call" : "fold";
                }
            }
            case TRICKY -> {
                // 诡计型：好牌装弱，烂牌诈唬
                if (strength >= 0.8) {
                    // 好牌：70% 概率装弱只跟，30% 加注
                    action = RANDOM_GEN.nextDouble() < 0.7 ? "call" : "raise";
                    if ("raise".equals(action))
                        amount = currentBet * 2;
                } else if (strength >= 0.5) {
                    action = "call";
                } else if (strength >= 0.2) {
                    // 烂牌诈唬：30% 概率加注
                    if (RANDOM_GEN.nextDouble() < 0.3) {
                        action = "raise";
                        amount = currentBet * 2;
                    } else {
                        action = RANDOM_GEN.nextDouble() < 0.5 ? "call" : "fold";
                    }
                } else {
                    // 最烂的牌：15% 概率诈唬 all-in
                    if (RANDOM_GEN.nextDouble() < 0.15) {
                        action = "all_in";
                    } else {
                        action = "fold";
                    }
                }
            }
            case RANDOM -> {
                // 随机型：完全不可预测
                double rand = RANDOM_GEN.nextDouble();
                if (rand < 0.15) {
                    action = "fold";
                } else if (rand < 0.55) {
                    action = "call";
                } else if (rand < 0.85) {
                    action = "raise";
                    amount = currentBet * (2 + RANDOM_GEN.nextInt(3));
                } else {
                    action = "all_in";
                }
            }
            default -> { // BALANCED
                // 均衡型：标准策略
                if (strength >= 0.8) {
                    if (RANDOM_GEN.nextDouble() < aggression * 0.6) {
                        action = "all_in";
                    } else {
                        action = "raise";
                        amount = currentBet * 2;
                    }
                } else if (strength >= 0.5) {
                    action = RANDOM_GEN.nextDouble() < aggression * 0.3 ? "raise" : "call";
                    if ("raise".equals(action))
                        amount = currentBet * 2;
                } else if (strength >= 0.3) {
                    action = RANDOM_GEN.nextDouble() < 0.6 ? "call" : "fold";
                } else {
                    action = RANDOM_GEN.nextDouble() < 0.25 ? "call" : "fold";
                }
            }
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
        // 不同策略看牌时机不同
        double baseProbability = switch (strategy) {
            case CONSERVATIVE -> 0.6; // 保守型更早看牌
            case AGGRESSIVE -> 0.2; // 激进型喜欢暗牌
            case TRICKY -> 0.3; // 诡计型适中
            case RANDOM -> RANDOM_GEN.nextDouble();
            default -> 0.4;
        };
        double prob = baseProbability + Math.min(round / 5.0, 0.5);
        return RANDOM_GEN.nextDouble() < prob;
    }

    private double handStrength(HandResult r) {
        return switch (r.getType()) {
            case THREE_OF_KIND -> 0.95 + r.getPrimaryRank() / 14.0 * 0.05;
            case STRAIGHT_FLUSH -> 0.85 + r.getPrimaryRank() / 14.0 * 0.1;
            case FLUSH -> 0.65 + (r.getSortedValues()[0] / 14.0) * 0.15;
            case STRAIGHT -> 0.55 + r.getPrimaryRank() / 14.0 * 0.1;
            case PAIR -> 0.30 + (r.getPrimaryRank() / 100.0 / 14.0) * 0.2;
            case HIGH_CARD -> r.getSortedValues()[0] / 14.0 * 0.3;
        };
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public Strategy getStrategy() {
        return strategy;
    }

    public record Decision(String action, long amount, long delayMs) {
    }
}
