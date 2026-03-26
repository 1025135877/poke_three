/**
 * 大厅页面 — 基于 ui/lobby_1 设计
 * 包含 Hero Banner、今日大奖、房间选择、今日任务
 */
import { store } from '../store.js';
import { wsClient } from '../ws.js';
import { router } from '../router.js';
import { getAvatarUrl } from '../utils/avatarUtil.js';

export function renderLobby() {
  const player = store.state.player;

  const page = document.createElement('div');
  page.className = 'page';
  page.id = 'lobby-page';

  page.innerHTML = `
    <!-- 顶部用户信息 -->
    <header class="top-bar">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-full border-4 border-primary-container bg-surface-container overflow-hidden shadow-sm transition-transform hover:scale-105 active:scale-95 duration-300">
          <img src="${getAvatarUrl(player.avatar || player.name)}" alt="avatar" class="w-full h-full object-cover" />
        </div>
        <div>
          <h1 class="text-xl font-headline font-extrabold text-on-surface">欢乐三张</h1>
          <div class="flex items-center gap-1 text-sm text-primary font-bold">
            <span class="material-symbols-outlined text-sm filled" style="font-variation-settings: 'FILL' 1;">monetization_on</span>
            <span id="lobby-chips">${player.chips.toLocaleString()}</span>
          </div>
        </div>
      </div>
      <button class="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors active:scale-90 duration-200">
        <span class="material-symbols-outlined text-on-surface-variant">settings</span>
      </button>
    </header>

    <!-- 主内容区 -->
    <main class="px-5 space-y-5 mt-2">
      <!-- Hero Banner -->
      <section class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-container to-primary h-52 flex items-center p-6 shadow-xl group border-4 border-primary cursor-pointer transition-transform active:scale-[0.98] duration-200" id="hero-banner">
        <div class="z-10 flex-1">
          <h2 class="text-3xl font-headline font-extrabold text-on-primary-container leading-tight drop-shadow-sm">
            即刻开局<br/><span class="text-secondary">赢取千万金币</span>
          </h2>
          <button class="btn-secondary mt-4 flex items-center gap-2 text-base" id="btn-quick-start">
            <span class="material-symbols-outlined filled" style="font-variation-settings: 'FILL' 1;">play_arrow</span>
            快速开始
          </button>
        </div>
        <div class="absolute right-4 bottom-4 text-8xl opacity-20 rotate-12">🃏</div>
        <div class="absolute -right-4 -bottom-4 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      </section>

      <!-- 今日大奖 -->
      <section class="bg-surface-container-high rounded-full px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-secondary rounded-full flex items-center justify-center shadow-inner">
            <span class="material-symbols-outlined text-on-secondary filled" style="font-variation-settings: 'FILL' 1;">stars</span>
          </div>
          <div>
            <p class="text-xs text-on-surface-variant font-body">今日大奖</p>
            <p class="text-xl font-headline font-extrabold text-secondary">¥1,288,500.00</p>
          </div>
        </div>
        <div class="flex items-center -space-x-2">
          <div class="w-8 h-8 rounded-full border-2 border-surface-container-high overflow-hidden bg-surface-container">
            <img src="${getAvatarUrl('winner1')}" alt="" class="w-full h-full" />
          </div>
          <div class="w-8 h-8 rounded-full border-2 border-surface-container-high overflow-hidden bg-surface-container">
            <img src="${getAvatarUrl('winner2')}" alt="" class="w-full h-full" />
          </div>
          <div class="w-8 h-8 rounded-full border-2 border-surface-container-high bg-primary flex items-center justify-center text-[10px] font-bold text-on-primary-container">+99</div>
        </div>
      </section>

      <!-- 房间选择 -->
      <section class="grid grid-cols-2 gap-4">
        <!-- 新手场 -->
        <div class="relative overflow-hidden rounded-2xl bg-surface-container p-5 cursor-pointer group hover:bg-surface-container-high transition-all duration-300 active:scale-[0.97] border-2 border-transparent hover:border-primary-container" data-room="beginner">
          <div class="tag tag-green mb-2 inline-block">底注 100</div>
          <h3 class="text-xl font-headline font-extrabold text-on-surface">新手场</h3>
          <p class="text-xs text-on-surface-variant font-body mt-1">小试牛刀 欢乐无限</p>
          <div class="mt-3 text-5xl opacity-80">📦</div>
          <div class="absolute inset-0 opacity-5 pointer-events-none">
            <span class="material-symbols-outlined text-[120px] absolute -bottom-4 -left-4 rotate-12">poker_chip</span>
          </div>
        </div>

        <!-- 普通场 -->
        <div class="relative overflow-hidden rounded-2xl bg-surface-container p-5 cursor-pointer group hover:bg-surface-container-high transition-all duration-300 active:scale-[0.97] border-2 border-transparent hover:border-primary-container" data-room="normal">
          <div class="tag tag-yellow mb-2 inline-block">底注 1,000</div>
          <h3 class="text-xl font-headline font-extrabold text-on-surface">普通场</h3>
          <p class="text-xs text-on-surface-variant font-body mt-1">高手过招 见招拆招</p>
          <div class="mt-3 text-5xl opacity-80">💰</div>
          <div class="absolute inset-0 opacity-5 pointer-events-none">
            <span class="material-symbols-outlined text-[120px] absolute -bottom-4 -left-4 rotate-12">payments</span>
          </div>
        </div>

        <!-- 富豪场 -->
        <div class="col-span-2 h-40 relative overflow-hidden rounded-2xl bg-surface-container-highest p-6 flex items-center justify-between cursor-pointer group hover:bg-surface-bright transition-all duration-300 active:scale-[0.98] border-2 border-transparent hover:border-primary-container" data-room="rich">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="tag tag-red">底注 10,000</span>
              <span class="flex items-center gap-1 text-secondary text-sm font-bold">
                <span class="material-symbols-outlined text-sm filled" style="font-variation-settings: 'FILL' 1;">local_fire_department</span>
                热门
              </span>
            </div>
            <h3 class="text-2xl font-headline font-extrabold text-on-surface">富豪场</h3>
            <p class="text-sm text-on-surface-variant font-body mt-1">巅峰对决 一掷千金</p>
          </div>
          <div class="text-7xl opacity-80">🏆</div>
          <div class="absolute inset-0 opacity-5 pointer-events-none">
            <span class="material-symbols-outlined text-[160px] absolute -right-8 -bottom-8">diamond</span>
          </div>
        </div>
      </section>

      <!-- 今日任务 -->
      <section class="relative rounded-2xl border-2 border-dashed border-tertiary/30 px-5 py-4 flex items-center justify-between bg-tertiary/5">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-tertiary rounded-full flex items-center justify-center shadow-md">
            <span class="material-symbols-outlined text-on-tertiary filled" style="font-variation-settings: 'FILL' 1;">emoji_events</span>
          </div>
          <div>
            <p class="text-base font-headline font-bold text-on-surface">今日任务 (2/5)</p>
            <div class="w-32 h-1.5 bg-surface-container rounded-full mt-1 overflow-hidden">
              <div class="w-2/5 h-full bg-tertiary rounded-full transition-all duration-500"></div>
            </div>
          </div>
        </div>
        <button class="btn-primary text-sm px-5 py-2.5">领取</button>
      </section>
    </main>
  `;

  // 绑定事件
  setTimeout(() => {
    // 快速开始
    const btnQuickStart = page.querySelector('#btn-quick-start');
    btnQuickStart?.addEventListener('click', (e) => {
      e.stopPropagation();
      _quickMatch('beginner', page);
    });

    // Hero Banner 点击
    page.querySelector('#hero-banner')?.addEventListener('click', () => {
      _quickMatch('beginner', page);
    });

    // 房间点击
    page.querySelectorAll('[data-room]').forEach(el => {
      el.addEventListener('click', () => {
        const roomType = el.dataset.room;
        _quickMatch(roomType, page);
      });
    });
  }, 0);

  return page;
}

/** 匹配中遮罩 */
let matchingOverlay = null;

function _showMatchingOverlay(page) {
  _hideMatchingOverlay();
  matchingOverlay = document.createElement('div');
  matchingOverlay.id = 'matching-overlay';
  matchingOverlay.innerHTML = `
    <div style="position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.6);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;backdrop-filter:blur(4px);">
      <div style="width:48px;height:48px;border:4px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
      <p style="color:#fff;font-size:18px;font-weight:700;">正在匹配中...</p>
      <p style="color:rgba(255,255,255,0.6);font-size:13px;">寻找合适的对手</p>
      <button id="cancel-match" style="margin-top:16px;padding:8px 32px;border-radius:24px;background:rgba(255,255,255,0.15);color:#fff;font-weight:600;font-size:14px;border:1px solid rgba(255,255,255,0.3);cursor:pointer;">取消</button>
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  `;
  document.body.appendChild(matchingOverlay);

  matchingOverlay.querySelector('#cancel-match')?.addEventListener('click', () => {
    _hideMatchingOverlay();
  });
}

function _hideMatchingOverlay() {
  if (matchingOverlay) {
    matchingOverlay.remove();
    matchingOverlay = null;
  }
}

function _showToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:10000;background:#333;color:#fff;padding:10px 24px;border-radius:24px;font-size:14px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.3);animation:fadeInOut 2.5s ease;';
  toast.textContent = message;
  const style = document.createElement('style');
  style.textContent = '@keyframes fadeInOut{0%{opacity:0;transform:translateX(-50%) translateY(-8px)}10%{opacity:1;transform:translateX(-50%)}80%{opacity:1}100%{opacity:0;transform:translateX(-50%) translateY(-8px)}}';
  toast.appendChild(style);
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

function _quickMatch(roomType, page) {
  _showMatchingOverlay(page);

  // 监听匹配失败
  const offFail = wsClient.on('match_failed', (data) => {
    _hideMatchingOverlay();
    _showToast(data.message || '匹配失败');
    offFail();
  });

  // 监听匹配成功（进入房间后自动关闭遮罩）
  const offJoin = wsClient.on('room_joined', () => {
    _hideMatchingOverlay();
    offJoin();
    offFail();
  });

  wsClient.send('quick_match', { roomType });
}
