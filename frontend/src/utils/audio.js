/**
 * 音频管理模块
 * 负责背景音乐和操作语音的播放
 */

class AudioManager {
    constructor() {
        this.bgm = null;
        this.currentBgmType = null;
        this.isMuted = localStorage.getItem('isMuted') === 'true';
        this.volume = 0.5;

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
