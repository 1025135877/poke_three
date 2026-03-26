/**
 * 全局状态管理（简易响应式）
 */

// 初始状态
const initialState = {
    // 登录状态
    isLoggedIn: false,

    // 玩家信息
    player: {
        id: null,
        name: '',
        avatar: '',
        chips: 0,
        diamonds: 0,
        vipLevel: 0,
        totalGames: 0,
        winRate: 0,
        maxWin: 0
    },

    // 房间状态
    room: null,

    // 游戏状态
    game: {
        phase: null,
        pot: 0,
        currentBet: 0,
        currentPlayer: null,
        myCards: [],
        hasLooked: false,
        players: []
    },

    // 结算数据
    result: null,

    // UI 状态
    ui: {
        currentPage: '/',
        loading: false,
        toast: null
    }
};

class Store {
    constructor() {
        this.state = JSON.parse(JSON.stringify(initialState));
        this.listeners = new Map();
    }

    /**
     * 获取状态
     */
    get(path) {
        return path.split('.').reduce((obj, key) => obj?.[key], this.state);
    }

    /**
     * 设置状态
     */
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const parent = keys.reduce((obj, key) => {
            if (!obj[key]) obj[key] = {};
            return obj[key];
        }, this.state);

        parent[lastKey] = value;

        // 通知监听器
        this._notify(path, value);
    }

    /**
     * 批量更新
     */
    update(path, updates) {
        const current = this.get(path);
        if (typeof current === 'object' && current !== null) {
            Object.assign(current, updates);
            this._notify(path, current);
        }
    }

    /**
     * 监听状态变化
     */
    on(path, callback) {
        if (!this.listeners.has(path)) {
            this.listeners.set(path, []);
        }
        this.listeners.get(path).push(callback);

        // 返回取消监听函数
        return () => {
            const cbs = this.listeners.get(path);
            if (cbs) {
                const idx = cbs.indexOf(callback);
                if (idx >= 0) cbs.splice(idx, 1);
            }
        };
    }

    /**
     * 通知监听器
     */
    _notify(path, value) {
        // 精确匹配
        const listeners = this.listeners.get(path);
        if (listeners) {
            listeners.forEach(cb => cb(value));
        }

        // 通配符匹配（父路径变化也通知子路径监听器）
        for (const [key, cbs] of this.listeners) {
            if (key.startsWith(path + '.') || path.startsWith(key + '.')) {
                cbs.forEach(cb => cb(this.get(key)));
            }
        }
    }

    /**
     * 重置状态
     */
    reset() {
        this.state = JSON.parse(JSON.stringify(initialState));
    }
}

// 全局 Store 实例
export const store = new Store();
