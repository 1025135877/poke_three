CREATE DATABASE IF NOT EXISTS poke_three DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

USE poke_three;

CREATE TABLE IF NOT EXISTS t_player (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(50),
    password VARCHAR(128) DEFAULT NULL,
    salt VARCHAR(64) DEFAULT NULL,
    avatar VARCHAR(255) DEFAULT '',
    chips BIGINT DEFAULT 888230,
    diamonds INT DEFAULT 520,
    total_games INT DEFAULT 0,
    win_games INT DEFAULT 0,
    max_win BIGINT DEFAULT 0,
    created_at DATETIME,
    updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS t_game_record (
    id VARCHAR(64) PRIMARY KEY,
    room_id VARCHAR(64),
    room_type VARCHAR(32),
    player_id VARCHAR(64),
    player_name VARCHAR(50),
    hand_type VARCHAR(32),
    bet_amount BIGINT DEFAULT 0,
    profit BIGINT DEFAULT 0,
    is_winner TINYINT DEFAULT 0,
    played_at DATETIME
);
