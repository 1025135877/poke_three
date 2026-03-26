-- 欢乐三张（炸金花）数据库初始化脚本
-- SQLite

-- 玩家信息表
CREATE TABLE IF NOT EXISTS t_player (
    id           TEXT     NOT NULL PRIMARY KEY,
    name         TEXT     NOT NULL UNIQUE,
    password     TEXT     NOT NULL DEFAULT '',
    salt         TEXT     NOT NULL DEFAULT '',
    avatar       TEXT     DEFAULT '',
    chips        INTEGER  DEFAULT 888230,
    diamonds     INTEGER  DEFAULT 520,
    total_games  INTEGER  DEFAULT 0,
    win_games    INTEGER  DEFAULT 0,
    max_win      INTEGER  DEFAULT 0,
    created_at   TEXT     DEFAULT (datetime('now', 'localtime')),
    updated_at   TEXT     DEFAULT (datetime('now', 'localtime'))
);

-- 对局记录表
CREATE TABLE IF NOT EXISTS t_game_record (
    id           INTEGER  PRIMARY KEY AUTOINCREMENT,
    room_id      TEXT     NOT NULL,
    room_type    TEXT     DEFAULT 'beginner',
    player_id    TEXT     NOT NULL,
    player_name  TEXT     NOT NULL,
    hand_cards   TEXT     DEFAULT NULL,
    hand_type    TEXT     DEFAULT NULL,
    bet_amount   INTEGER  DEFAULT 0,
    profit       INTEGER  DEFAULT 0,
    is_winner    INTEGER  DEFAULT 0,
    played_at    TEXT     DEFAULT (datetime('now', 'localtime'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_player_chips ON t_player(chips DESC);
CREATE INDEX IF NOT EXISTS idx_record_player ON t_game_record(player_id);
CREATE INDEX IF NOT EXISTS idx_record_room ON t_game_record(room_id);
CREATE INDEX IF NOT EXISTS idx_record_played_at ON t_game_record(played_at DESC);
