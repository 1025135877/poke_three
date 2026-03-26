/**
 * WebSocket 客户端封装
 * 提供连接/重连/心跳/消息收发
 */
import { store } from './store.js';
import { router } from './router.js';

class WebSocketClient {
    constructor() {
        this.ws = null;
        this.url = '';
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        this.heartbeatInterval = null;
        this.handlers = new Map();
        this.isConnected = false;
    }

    /**
     * 连接到服务器
     */
    connect(url) {
        this.url = url || this._getWSUrl();

        try {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                console.log('✅ WebSocket 已连接');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this._startHeartbeat();

                // 使用 token 登录
                const token = localStorage.getItem('token');
                if (token) {
                    this.send('login', { token });
                }
            };

            this.ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    this._handleMessage(msg);
                } catch (e) {
                    console.error('消息解析失败:', e);
                }
            };

            this.ws.onclose = () => {
                console.log('❌ WebSocket 已断开');
                this.isConnected = false;
                this._stopHeartbeat();
                this._reconnect();
            };

            this.ws.onerror = (err) => {
                console.error('WebSocket 错误:', err);
            };
        } catch (e) {
            console.error('WebSocket 连接失败:', e);
            this._reconnect();
        }
    }

    /**
     * 发送消息
     */
    send(type, data = {}) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, data }));
        } else {
            console.warn('WebSocket 未连接，无法发送:', type);
        }
    }

    /**
     * 注册消息处理器
     */
    on(type, handler) {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, []);
        }
        this.handlers.get(type).push(handler);
        return () => {
            const handlers = this.handlers.get(type);
            if (handlers) {
                const idx = handlers.indexOf(handler);
                if (idx >= 0) handlers.splice(idx, 1);
            }
        };
    }

    /**
     * 断开连接
     */
    disconnect() {
        this._stopHeartbeat();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    // ===== 内部方法 =====

    _getWSUrl() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${window.location.host}/ws`;
    }

    _handleMessage(msg) {
        const { type, data } = msg;

        // 触发注册的处理器
        const handlers = this.handlers.get(type);
        if (handlers) {
            handlers.forEach(h => h(data));
        }

        // 内置消息处理
        switch (type) {
            case 'login_success':
                store.update('player', {
                    id: data.playerId,
                    name: data.name,
                    chips: data.chips
                });
                break;

            case 'reconnected':
                // 断线重连恢复房间
                console.log('🔄 断线重连成功，恢复房间:', data.roomId);
                store.set('room', {
                    roomId: data.roomId,
                    roomType: data.roomType,
                    state: data.state
                });
                this._syncGameState(data.state);
                router.navigate('/table');
                break;

            case 'room_joined':
                store.set('room', data);
                this._syncGameState(data.state);
                router.navigate('/table');
                break;

            case 'room_state':
                // 其他玩家加入/准备/离开时刷新状态
                this._syncGameState(data);
                break;

            case 'match_failed':
                console.warn('匹配失败:', data.message);
                break;

            case 'player_ready':
            case 'game_started':
            case 'next_turn':
            case 'player_called':
            case 'player_raised':
            case 'player_all_in':
            case 'player_folded':
            case 'player_looked':
                if (data.state) {
                    this._syncGameState(data.state);
                }
                break;

            case 'deal_cards':
                store.set('game.myCards', data.cards);
                break;

            case 'cards_revealed':
                store.set('game.myCards', data.cards);
                store.set('game.hasLooked', true);
                break;

            case 'game_over':
                store.set('result', data);
                store.set('game.phase', 'finished');

                // 从结算结果中同步自己的最新金币
                if (data.results && store.state.player.id) {
                    const myResult = data.results.find(r => r.playerId === store.state.player.id);
                    if (myResult && myResult.chips !== undefined) {
                        store.update('player', { chips: myResult.chips });
                    }
                }

                // 延迟跳转到结算页
                setTimeout(() => {
                    router.navigate('/result');
                }, 1500);
                break;

            case 'room_left':
                store.set('room', null);
                store.set('game.phase', null);
                router.navigate('/');
                break;

            case 'room_reset':
                store.set('game.phase', null);
                store.set('game.myCards', []);
                store.set('game.hasLooked', false);
                store.set('result', null);
                break;

            case 'error':
                console.error('服务器错误:', data.message);
                break;

            case 'pong':
                // 心跳响应
                break;
        }
    }

    _syncGameState(state) {
        if (!state) return;
        store.update('game', {
            phase: state.phase,
            pot: state.pot,
            currentBet: state.currentBet,
            currentPlayer: state.currentPlayer,
            players: state.players,
            round: state.round
        });
    }

    _startHeartbeat() {
        this._stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            this.send('ping');
        }, 30000);
    }

    _stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    _reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('WebSocket 重连次数已达上限');
            return;
        }
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * this.reconnectAttempts;
        console.log(`将在 ${delay}ms 后尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        setTimeout(() => this.connect(this.url), delay);
    }
}

// 全局 WebSocket 实例
export const wsClient = new WebSocketClient();
