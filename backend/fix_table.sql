DROP TABLE IF EXISTS `t_game_record`;

CREATE TABLE `t_game_record` (
    `id`          BIGINT AUTO_INCREMENT NOT NULL,
    `room_id`     VARCHAR(36)  NOT NULL,
    `room_type`   VARCHAR(20)  DEFAULT 'beginner',
    `player_id`   VARCHAR(36)  NOT NULL,
    `player_name` VARCHAR(50)  NOT NULL,
    `hand_cards`  VARCHAR(100) DEFAULT NULL,
    `hand_type`   VARCHAR(20)  DEFAULT NULL,
    `bet_amount`  BIGINT       DEFAULT 0,
    `profit`      BIGINT       DEFAULT 0,
    `is_winner`   TINYINT(1)   DEFAULT 0,
    `played_at`   DATETIME     DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_player` (`player_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
