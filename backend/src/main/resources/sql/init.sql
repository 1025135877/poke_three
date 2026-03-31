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

-- Token 存储表
CREATE TABLE IF NOT EXISTS t_token (
    token       TEXT     NOT NULL PRIMARY KEY,
    player_id   TEXT     NOT NULL UNIQUE,
    created_at  TEXT     DEFAULT (datetime('now', 'localtime'))
);
CREATE INDEX IF NOT EXISTS idx_token_player ON t_token(player_id);

-- 每日签到记录表
CREATE TABLE IF NOT EXISTS t_daily_checkin (
    id           INTEGER  PRIMARY KEY AUTOINCREMENT,
    player_id    TEXT     NOT NULL,
    checkin_date TEXT     NOT NULL,
    day_count    INTEGER  DEFAULT 1,
    reward_chips INTEGER  DEFAULT 0,
    created_at   TEXT     DEFAULT (datetime('now', 'localtime')),
    UNIQUE(player_id, checkin_date)
);
CREATE INDEX IF NOT EXISTS idx_checkin_player ON t_daily_checkin(player_id);

-- 每日任务记录表
CREATE TABLE IF NOT EXISTS t_daily_task (
    id           INTEGER  PRIMARY KEY AUTOINCREMENT,
    player_id    TEXT     NOT NULL,
    task_date    TEXT     NOT NULL,
    task_type    TEXT     NOT NULL,
    progress     INTEGER  DEFAULT 0,
    is_completed INTEGER  DEFAULT 0,
    is_claimed   INTEGER  DEFAULT 0,
    created_at   TEXT     DEFAULT (datetime('now', 'localtime')),
    UNIQUE(player_id, task_date, task_type)
);
CREATE INDEX IF NOT EXISTS idx_task_player ON t_daily_task(player_id);

-- 玩家道具持有表
CREATE TABLE IF NOT EXISTS t_player_item (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id  TEXT    NOT NULL,
    item_type  TEXT    NOT NULL,
    quantity   INTEGER DEFAULT 0,
    updated_at TEXT    DEFAULT (datetime('now','localtime')),
    UNIQUE(player_id, item_type)
);
CREATE INDEX IF NOT EXISTS idx_item_player ON t_player_item(player_id);

-- 迁移：为已有 t_daily_task 表添加 progress 列（忽略已存在的情况）
-- SQLite ALTER TABLE ADD COLUMN 如果列已存在会报错，但 Spring init-mode: always 会忽略
ALTER TABLE t_daily_task ADD COLUMN progress INTEGER DEFAULT 0;
