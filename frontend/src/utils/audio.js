/**
 * 音频管理模块
 * 负责背景音乐和操作语音的播放
 */

class AudioManager {
    constructor() {
        this.bgm = null;
        this.currentBgmType = null;
        this.isMuted = localStorage.getItem('isMuted') === 'true';
        this.volume = parseFloat(localStorage.getItem('audioVolume') || '0.5');

        // 预定义音频文件路径 (请将实际音频文件放在 public/audio/ 目录下)
        this.bgmTracks = {
            lobby: '/audio/bgm_lobby.mp3',
            game: '/audio/bgm_game.mp3'
        };

        // 操作语音 (按性别划分)
        this.voiceLines = {
            male: {
                call: '/audio/voice/m_call.mp3', // 跟注
                raise: '/audio/voice/m_raise.mp3', // 加注
                fold: '/audio/voice/m_fold.mp3', // 弃牌
                all_in: '/audio/voice/m_allin.mp3', // 全压
                look: '/audio/voice/m_look.mp3', // 看牌
                compare: '/audio/voice/m_compare.mp3', // 比牌
            },
            female: {
                call: '/audio/voice/f_call.mp3',
                raise: '/audio/voice/f_raise.mp3',
                fold: '/audio/voice/f_fold.mp3',
                all_in: '/audio/voice/f_allin.mp3',
                look: '/audio/voice/f_look.mp3',
                compare: '/audio/voice/f_compare.mp3',
            }
        };

        // 缓存 audio 对象以提高响应速度
        this.audioCache = {};
    }

    /**
     * 设置静音状态
     */
    setMuted(muted) {
        this.isMuted = muted;
        localStorage.setItem('isMuted', muted);
        if (this.bgm) {
            this.bgm.muted = muted;
        }
    }

    toggleMuted() {
        this.setMuted(!this.isMuted);
        return this.isMuted;
    }

    /**
     * 设置音量 (0~1)
     */
    setVolume(v) {
        this.volume = Math.min(1, Math.max(0, v));
        localStorage.setItem('audioVolume', this.volume);
        if (this.bgm) {
            this.bgm.volume = this.volume * 0.6;
        }
        // 同步已缓存的音频对象
        for (const audio of Object.values(this.audioCache)) {
            audio.volume = this.volume;
        }
    }

    /**
     * 播放背景音乐
     * @param {'lobby' | 'game'} type 场景类型
     */
    playBGM(type) {
        if (this.currentBgmType === type && this.bgm) {
            if (!this.isMuted && this.bgm.paused) {
                this.bgm.play().catch(e => console.warn('BGM auto-play blocked:', e));
            }
            return;
        }

        this.stopBGM();

        const src = this.bgmTracks[type];
        if (!src) return;

        this.bgm = new Audio(src);
        this.bgm.loop = true;
        this.bgm.volume = this.volume * 0.6; // 背景音稍微轻一点
        this.bgm.muted = this.isMuted;
        this.currentBgmType = type;

        // 只有在非静音且用户已经交互过的情况下才能播放
        if (!this.isMuted) {
            this.bgm.play().catch(e => console.warn('BGM auto-play blocked, waiting for user interaction', e));
        }
    }

    stopBGM() {
        if (this.bgm) {
            this.bgm.pause();
            this.bgm.currentTime = 0;
            this.bgm = null;
        }
        this.currentBgmType = null;
    }

    /**
     * 播放动作语音
     * @param {string} action 动作类型: call, raise, fold, all_in, look, compare
     * @param {'male' | 'female'} gender 性别
     */
    playVoice(action, gender = 'male') {
        if (this.isMuted) return;

        const src = this.voiceLines[gender]?.[action];
        if (!src) return;

        let audio = this.audioCache[src];
        if (!audio) {
            audio = new Audio(src);
            this.audioCache[src] = audio;
        }

        // 每次播放重置时间
        audio.currentTime = 0;
        audio.volume = this.volume;
        audio.play().catch(e => console.warn('Voice play failed:', e));
    }

    /**
     * 特殊音效
     */
    playSoundEffect(type) {
        if (this.isMuted) return;
        const fxMap = {
            win: '/audio/fx_win.mp3',
            lose: '/audio/fx_lose.mp3',
            chips: '/audio/fx_chips.mp3'
        };
        const src = fxMap[type];
        if (!src) return;

        let audio = this.audioCache[src];
        if (!audio) {
            audio = new Audio(src);
            this.audioCache[src] = audio;
        }
        audio.currentTime = 0;
        audio.volume = this.volume;
        audio.play().catch(e => { });
    }
}

export const audioManager = new AudioManager();

// 尝试在用户第一次点击时恢复音频播放
document.addEventListener('click', () => {
    if (audioManager.bgm && audioManager.bgm.paused && !audioManager.isMuted) {
        audioManager.bgm.play().catch(() => { });
    }
}, { once: true });

/**
 * 弹出音量控制面板（公共组件，大厅和牌桌共用）
 */
export function showVolumePanel() {
    // 防止重复弹出
    if (document.getElementById('volume-panel-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'volume-panel-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);animation:fadeIn 0.2s ease;';

    const muted = audioManager.isMuted;
    const vol = Math.round(audioManager.volume * 100);

    overlay.innerHTML = `
        <style>
            @keyframes fadeIn{from{opacity:0}to{opacity:1}}
            @keyframes panelIn{from{opacity:0;transform:scale(0.95) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
            .vol-panel{background:linear-gradient(145deg,#1a1a2e,#16213e);border-radius:20px;padding:28px 24px;width:90%;max-width:320px;box-shadow:0 16px 48px rgba(0,0,0,0.5);animation:panelIn 0.3s ease;border:1px solid rgba(255,255,255,0.08);}
            .vol-title{font-size:17px;font-weight:800;color:#fff;text-align:center;margin-bottom:20px;}
            .vol-row{display:flex;align-items:center;gap:14px;margin-bottom:18px;padding:12px 14px;background:rgba(255,255,255,0.04);border-radius:12px;}
            .vol-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;flex-shrink:0;}
            .vol-icon.muted{background:rgba(239,68,68,0.15);color:#ef4444;}
            .vol-icon.unmuted{background:rgba(34,197,94,0.15);color:#22c55e;}
            .vol-icon:active{transform:scale(0.9);}
            .vol-slider-wrap{flex:1;display:flex;flex-direction:column;gap:4px;}
            .vol-label{font-size:11px;color:rgba(255,255,255,0.5);display:flex;justify-content:space-between;}
            .vol-slider{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:3px;outline:none;background:linear-gradient(to right,#22c55e ${vol}%,rgba(255,255,255,0.1) ${vol}%);cursor:pointer;}
            .vol-slider::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#22c55e;box-shadow:0 2px 6px rgba(34,197,94,0.4);cursor:pointer;transition:transform 0.15s;}
            .vol-slider::-webkit-slider-thumb:active{transform:scale(1.2);}
            .vol-close{display:block;margin:4px auto 0;padding:10px 32px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);color:#fff;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s;}
            .vol-close:hover{background:rgba(255,255,255,0.12);}
        </style>
        <div class="vol-panel">
            <div class="vol-title">🔊 音频设置</div>
            <div class="vol-row">
                <div class="vol-icon ${muted ? 'muted' : 'unmuted'}" id="vol-mute-btn">
                    <span style="font-size:20px;">${muted ? '🔇' : '🔊'}</span>
                </div>
                <div class="vol-slider-wrap">
                    <div class="vol-label"><span>音量</span><span id="vol-val">${vol}%</span></div>
                    <input type="range" class="vol-slider" id="vol-range" min="0" max="100" value="${vol}" ${muted ? 'disabled' : ''}>
                </div>
            </div>
            <button class="vol-close" id="vol-close-btn">关闭</button>
        </div>
    `;

    document.body.appendChild(overlay);

    // 音量滑动条
    const range = overlay.querySelector('#vol-range');
    const valLabel = overlay.querySelector('#vol-val');
    range.addEventListener('input', (e) => {
        const v = parseInt(e.target.value);
        valLabel.textContent = v + '%';
        audioManager.setVolume(v / 100);
        // 更新滑动条渐变
        range.style.background = `linear-gradient(to right, #22c55e ${v}%, rgba(255,255,255,0.1) ${v}%)`;
    });

    // 静音按钮
    const muteBtn = overlay.querySelector('#vol-mute-btn');
    muteBtn.addEventListener('click', () => {
        const nowMuted = audioManager.toggleMuted();
        muteBtn.className = `vol-icon ${nowMuted ? 'muted' : 'unmuted'}`;
        muteBtn.innerHTML = `<span style="font-size:20px;">${nowMuted ? '🔇' : '🔊'}</span>`;
        range.disabled = nowMuted;
    });

    // 关闭
    overlay.querySelector('#vol-close-btn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}
