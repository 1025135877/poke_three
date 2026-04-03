/**
 * WebSocket 客户端封装
 * 提供连接/重连/心跳/消息收发
 */
import { store } from './store.js';
import { router } from './router.js';
import { audioManager } from './utils/audio.js';

function _getGender(playerId) {
    if (!playerId) return 'female';
    const players = store.state.game?.players || [];
    const p = players.find(pl => pl.id === playerId);
    return p?.gender === 'M' ? 'male' : 'female';
}

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
                if (data.state) {
                    this._syncGameState(data.state);
                }
                break;

            case 'player_called':
            case 'player_raised':
            case 'player_all_in':
                const actionPlayerId = data.playerId || data.state?.currentPlayer;
                if (type === 'player_called') audioManager.playVoice('call', _getGender(actionPlayerId));
                else if (type === 'player_raised') audioManager.playVoice('raise', _getGender(actionPlayerId));
                else if (type === 'player_all_in') audioManager.playVoice('all_in', _getGender(actionPlayerId));

                // 记录下注动作元数据，供 table.js 播放筹码飞行动画
                store.set('game.lastAction', {
                    type: type,
                    playerId: data.playerId || data.state?.currentPlayer,
                    amount: data.amount || 0,
                    timestamp: Date.now()
                });
                if (data.state) {
                    this._syncGameState(data.state);
                }
                break;

            case 'player_folded':
                audioManager.playVoice('fold', _getGender(data.playerId || data.state?.currentPlayer));
                // 记录弃牌动作（用于浮动提示）
                store.set('game.lastAction', {
                    type: 'player_folded',
                    playerId: data.playerId || data.state?.currentPlayer,
                    amount: 0,
                    timestamp: Date.now()
                });
                if (data.state) {
                    this._syncGameState(data.state);
                }
                break;

            case 'player_looked':
                audioManager.playVoice('look', _getGender(data.playerId || data.state?.currentPlayer));
                if (data.state) {
                    this._syncGameState(data.state);
                }
                break;

            case 'player_compared':
                audioManager.playVoice('compare', _getGender(data.challengerId));
                // 比牌结果展示
                this._showCompareResult(data);
                break;

            case 'deal_cards':
                audioManager.playSoundEffect('chips');
                store.set('game.myCards', data.cards);
                break;

            case 'cards_revealed':
                store.set('game.myCards', data.cards);
                store.set('game.hasLooked', true);
                break;

            case 'game_over':
                audioManager.stopBGM();
                if (data.results && store.state.player.id) {
                    const isWinner = data.results.some(r => r.playerId === store.state.player.id && r.profit > 0);
                    audioManager.playSoundEffect(isWinner ? 'win' : 'lose');
                }
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

            // ===== 道具消息 =====
            case 'xray_result':
                this._showXrayResult(data);
                break;

            case 'xray_warning':
                this._showXrayWarning(data);
                break;

            case 'swap_result':
                // 更新手牌
                if (data.hand) {
                    store.set('game.myCards', data.hand);
                }
                this._showSwapResult(data);
                break;

            case 'player_swapped': {
                // 在座位上显示换牌提示
                const swapSeat = document.querySelector(`[data-player-id="${data.playerId}"]`);
                if (swapSeat) {
                    const float = document.createElement('div');
                    float.className = 'action-float';
                    float.style.background = '#10b981';
                    float.style.color = '#ffffff';
                    float.style.boxShadow = '0 2px 8px rgba(16,185,129,0.5)';
                    float.textContent = '🔄 换牌';
                    swapSeat.style.position = swapSeat.style.position || 'relative';
                    swapSeat.appendChild(float);
                    float.addEventListener('animationend', () => float.remove());
                }
                break;
            }

            case 'item_error': {
                const errToast = document.createElement('div');
                errToast.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:10000;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:10px 24px;border-radius:24px;font-size:14px;font-weight:600;box-shadow:0 4px 16px rgba(245,158,11,0.4);animation:fadeInOut 3s ease;pointer-events:none;';
                errToast.textContent = '⚠️ ' + (data.message || '道具使用失败');
                const errStyle = document.createElement('style');
                errStyle.textContent = '@keyframes fadeInOut{0%{opacity:0;transform:translateX(-50%) translateY(-8px)}10%{opacity:1;transform:translateX(-50%)}80%{opacity:1}100%{opacity:0;transform:translateX(-50%) translateY(-8px)}}';
                errToast.appendChild(errStyle);
                document.body.appendChild(errToast);
                setTimeout(() => errToast.remove(), 3000);
                break;
            }

            case 'error':
                console.error('服务器错误:', data.message);
                break;

            case 'pong':
                // 心跳响应
                break;
        }
    }

    _showCompareResult(data) {
        const myId = store.state.player?.id;
        const players = store.state.game?.players || [];
        const challenger = players.find(p => p.id === data.challengerId) || { name: '玩家A' };
        const target = players.find(p => p.id === data.targetId) || { name: '玩家B' };
        const iWon = data.winnerId === myId;
        const iLost = data.loserId === myId;
        const isMyFight = data.challengerId === myId || data.targetId === myId;

        // 构建手牌显示
        const getCardHtml = (card, size = 'sm') => {
            if (!card) return '<div class="w-8 h-11 rounded bg-surface-container opacity-50 border border-outline-variant/20" style="margin-left:-2px;"></div>';
            const suit = card.symbol || { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }[card.suit] || '?';
            const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
            const display = card.display || String(card.value || '');

            const sizeClass = size === 'sm' ? 'w-8 h-11 text-[9px]' : size === 'md' ? 'w-16 h-24 text-sm' : 'w-24 h-36 text-lg';
            const symbolSize = size === 'sm' ? 'text-base' : size === 'md' ? 'text-3xl' : 'text-5xl';
            const padding = size === 'sm' ? 'top-0.5 left-0.5 bottom-0.5 right-0.5' : 'top-1.5 left-1.5 bottom-1.5 right-1.5';
            const color = isRed ? '#ef4444' : '#1e293b';

            return `
                <div class="${sizeClass} relative flex items-center justify-center bg-white rounded shadow-sm flex-shrink-0" style="margin-left:-2px;color: ${color}; border: 1px solid rgba(0,0,0,0.15);">
                    <span class="absolute ${padding} font-headline font-extrabold leading-none">${display}</span>
                    <span class="${symbolSize} select-none" style="line-height: 1;">${suit}</span>
                </div>
            `;
        };
        const formatHand = (cards) => `<div class="flex justify-center my-1.5">${(cards || []).map(c => getCardHtml(c, 'sm')).join('')}</div>`;

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);animation:fadeIn 0.3s ease;';

        const winColor = '#22c55e';
        const loseColor = '#ef4444';

        overlay.innerHTML = `
            <style>
                @keyframes fadeIn{from{opacity:0}to{opacity:1}}
                @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
                @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
                .compare-card{display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;padding:12px 6px;border-radius:12px;animation:slideUp 0.5s ease;overflow:hidden;min-width:0;}
                .compare-badge{font-size:11px;font-weight:800;padding:2px 10px;border-radius:20px;letter-spacing:1px;white-space:nowrap;}
                .vs-text{display:flex;align-items:center;font-size:20px;color:rgba(255,255,255,0.3);font-weight:900;margin:0 -4px;flex-shrink:0;}
            </style>
            <div style="width:92%;max-width:400px;background:linear-gradient(145deg,#1a1a2e 0%,#16213e 100%);border-radius:24px;padding:20px 16px;box-shadow:0 20px 60px rgba(0,0,0,0.6);animation:slideUp 0.4s ease">
                <h3 style="text-align:center;font-size:18px;font-weight:900;color:#fff;margin-bottom:16px;">
                    ⚔️ 比牌结果
                </h3>
                <div style="display:flex;gap:6px;align-items:stretch;justify-content:center;">
                    <div class="compare-card" style="background:${data.winnerId === data.challengerId ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}; border:2px solid ${data.winnerId === data.challengerId ? winColor : loseColor}40;">
                        <div style="font-size:13px;font-weight:700;color:#fff;width:100%;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${challenger.name}</div>
                        ${formatHand(data.challengerHand)}
                        <div style="font-size:11px;color:rgba(255,255,255,0.6);">${data.challengerHandType || ''}</div>
                        <span class="compare-badge" style="background:${data.winnerId === data.challengerId ? winColor : loseColor}; color:#fff;">
                            ${data.winnerId === data.challengerId ? '👑 胜' : '💀 败'}
                        </span>
                    </div>
                    <div class="vs-text">VS</div>
                    <div class="compare-card" style="background:${data.winnerId === data.targetId ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}; border:2px solid ${data.winnerId === data.targetId ? winColor : loseColor}40;">
                        <div style="font-size:13px;font-weight:700;color:#fff;width:100%;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${target.name}</div>
                        ${formatHand(data.targetHand)}
                        <div style="font-size:11px;color:rgba(255,255,255,0.6);">${data.targetHandType || ''}</div>
                        <span class="compare-badge" style="background:${data.winnerId === data.targetId ? winColor : loseColor}; color:#fff;">
                            ${data.winnerId === data.targetId ? '👑 胜' : '💀 败'}
                        </span>
                    </div>
                </div>
                ${isMyFight ? `<div style="text-align:center;margin-top:16px;font-size:18px;font-weight:800;color:${iWon ? winColor : loseColor};animation:pulse 1s infinite;">
                    ${iWon ? '🎉 你赢了！' : '😢 你输了...'}
                </div>` : ''}
            </div>
        `;

        // 如果我是被比牌的目标，先显示一个醒目的前置通知
        const isTarget = data.targetId === myId;
        const isChallenger = data.challengerId === myId;
        if (isTarget || isChallenger) {
            const preNotice = document.createElement('div');
            preNotice.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:10001;padding:10px 24px;border-radius:16px;font-size:14px;font-weight:800;box-shadow:0 4px 20px rgba(0,0,0,0.4);animation:compareNotify 1s ease;display:flex;align-items:center;gap:8px;';
            if (isTarget) {
                preNotice.style.background = 'linear-gradient(135deg, rgba(239,68,68,0.95), rgba(168,85,247,0.95))';
                preNotice.style.color = 'white';
                preNotice.innerHTML = `<span style="font-size:22px;">⚔️</span><span>${challenger.name} 向你发起了比牌！</span>`;
            } else {
                preNotice.style.background = 'linear-gradient(135deg, rgba(59,130,246,0.95), rgba(99,102,241,0.95))';
                preNotice.style.color = 'white';
                preNotice.innerHTML = `<span style="font-size:22px;">⚔️</span><span>你向 ${target.name} 发起了比牌</span>`;
            }
            const noticeStyle = document.createElement('style');
            noticeStyle.textContent = '@keyframes compareNotify{0%{opacity:0;transform:translateX(-50%) scale(0.8)}15%{opacity:1;transform:translateX(-50%) scale(1.05)}25%{transform:translateX(-50%) scale(1)}100%{opacity:1;transform:translateX(-50%)}}';
            preNotice.appendChild(noticeStyle);
            document.body.appendChild(preNotice);
            setTimeout(() => preNotice.remove(), 3000);
        }

        document.body.appendChild(overlay);
        // 自己参与的比牌：需要点击关闭，停留更久；旁观者：3.5秒自动消失
        if (isMyFight) {
            overlay.addEventListener('click', () => overlay.remove());
            setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 8000);
        } else {
            overlay.addEventListener('click', () => overlay.remove());
            setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 3500);
        }
    }

    // ===== 道具结果展示 =====

    _showXrayResult(data) {
        const card = data.card || {};
        const suit = card.symbol || { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }[card.suit] || '?';
        const rank = card.display || String(card.value || '');
        const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
        const color = isRed ? '#ef4444' : '#1e293b';

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);animation:fadeIn 0.3s ease;';

        overlay.innerHTML = `
            <div style="background:linear-gradient(135deg, rgba(99,102,241,0.2), rgba(30,30,60,0.95));border:2px solid rgba(99,102,241,0.4);border-radius:24px;padding:28px 36px;text-align:center;box-shadow:0 16px 48px rgba(99,102,241,0.3);">
                <div style="font-size:32px;margin-bottom:8px;">👁️</div>
                <div style="font-size:14px;color:rgba(255,255,255,0.6);margin-bottom:16px;">透视了 <strong style="color:#a5b4fc">${data.targetName || '对手'}</strong> 的一张牌</div>
                <div style="margin:0 auto 16px; width:90px; height:128px; background:#fff; border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; position:relative; color:${color}; border:2px solid rgba(0,0,0,0.1);">
                    <span style="position:absolute; top:8px; left:12px; font-size:18px; font-weight:800; font-family:sans-serif;">${rank}</span>
                    <span style="font-size:56px; line-height:1; user-select:none;">${suit}</span>
                    <span style="position:absolute; bottom:8px; right:12px; font-size:18px; font-weight:800; font-family:sans-serif; transform:rotate(180deg);">${rank}</span>
                </div>
                <div style="font-size:12px;color:rgba(255,255,255,0.4);">剩余透视卡: ${data.remainingXray ?? 0}</div>
            </div>
            <style>@keyframes fadeIn{from{opacity:0}to{opacity:1}}</style>
        `;

        document.body.appendChild(overlay);
        overlay.addEventListener('click', () => overlay.remove());
        setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 3000);
    }

    _showXrayWarning(data) {
        const warning = document.createElement('div');
        warning.style.cssText = 'position:fixed;top:100px;left:50%;transform:translateX(-50%);z-index:9999;background:linear-gradient(135deg, rgba(239,68,68,0.9), rgba(168,85,247,0.9));color:white;padding:12px 28px;border-radius:20px;font-size:14px;font-weight:700;box-shadow:0 4px 20px rgba(239,68,68,0.4);animation:xrayWarn 2.5s ease-in-out;display:flex;align-items:center;gap:8px;';
        warning.innerHTML = `<span style="font-size:20px;animation:eyePulse 0.5s ease infinite alternate;">👁️</span> <span>${data.hint || '有人在暗中观察你'}</span>`;

        const style = document.createElement('style');
        style.textContent = '@keyframes xrayWarn{0%{opacity:0;transform:translateX(-50%) scale(0.8)}10%{opacity:1;transform:translateX(-50%) scale(1.05)}15%{transform:translateX(-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translateX(-50%) translateY(-10px)}}@keyframes eyePulse{from{transform:scale(1)}to{transform:scale(1.2)}}';
        warning.appendChild(style);
        document.body.appendChild(warning);
        setTimeout(() => warning.remove(), 2500);
    }

    _showSwapResult(data) {
        const oldCard = data.oldCard || {};
        const newCard = data.newCard || {};
        const getMiniCard = (c) => {
            const suit = c.symbol || { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }[c.suit] || '?';
            const rank = c.display || String(c.value || '');
            const isRed = c.suit === 'hearts' || c.suit === 'diamonds';
            const color = isRed ? '#ef4444' : '#1e293b';
            return `<span style="display:inline-flex; align-items:center; justify-content:center; background:#fff; color:${color}; padding:0px 6px; border-radius:4px; border:1px solid rgba(0,0,0,0.1); margin:0 4px; font-weight:800; box-shadow:0 2px 4px rgba(0,0,0,0.2);">${suit}${rank}</span>`;
        };

        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;top:100px;left:50%;transform:translateX(-50%);z-index:9999;background:linear-gradient(135deg, rgba(16,185,129,0.9), rgba(6,95,70,0.9));color:white;padding:12px 28px;border-radius:20px;font-size:14px;font-weight:700;box-shadow:0 4px 20px rgba(16,185,129,0.4);animation:swapNotify 2.5s ease;display:flex;align-items:center;gap:4px;';
        toast.innerHTML = `<span style="font-size:18px;margin-right:2px;">🔄</span><span>${getMiniCard(oldCard)} → ${getMiniCard(newCard)}</span><span style="font-size:11px;opacity:0.7;margin-left:4px;">(剩余${data.remainingSwap ?? 0}张)</span>`;

        const style = document.createElement('style');
        style.textContent = '@keyframes swapNotify{0%{opacity:0;transform:translateX(-50%) translateY(-8px)}10%{opacity:1;transform:translateX(-50%)}80%{opacity:1}100%{opacity:0;transform:translateX(-50%) translateY(-8px)}}';
        toast.appendChild(style);
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
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
        console.log(`将在 ${delay}ms 后尝试重连(${this.reconnectAttempts} / ${this.maxReconnectAttempts})...`);
        setTimeout(() => this.connect(this.url), delay);
    }
}

// 全局 WebSocket 实例
export const wsClient = new WebSocketClient();
