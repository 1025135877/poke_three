/**
 * 牌桌页面 — 基于 ui/optimized_pot_layout_table 设计
 * 包含绿色牌桌、玩家座位、手牌、操作按钮、筹码特效
 */
import { store } from '../store.js';
import { wsClient } from '../ws.js';
import { router } from '../router.js';
import { renderHandCards } from '../components/card.js';
import { renderPlayerSeat, SEAT_POSITIONS } from '../components/playerSeat.js';
import { renderChipStack, createFlyingChip } from '../components/chipStack.js';
import { getAvatarUrl } from '../utils/avatarUtil.js';
import { audioManager } from '../utils/audio.js';

// 记录上次处理的 action 时间戳，避免重复播放动画
let _lastActionTimestamp = 0;

export function renderTable() {
  audioManager.playBGM('game');

  const game = store.state.game;
  const player = store.state.player;

  const page = document.createElement('div');
  page.className = 'fixed inset-0 bg-surface flex flex-col max-w-[430px] mx-auto overflow-hidden';
  page.id = 'table-page';

  page.innerHTML = `
    <!-- 顶部栏 -->
    <header class="flex justify-between items-center px-5 h-16 bg-surface/90 backdrop-blur-md z-50">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full border-3 border-primary-container overflow-hidden bg-surface-container">
          <img src="${getAvatarUrl(player.avatar || player.name)}" alt="avatar" class="w-full h-full object-cover" />
        </div>
        <div>
          <p class="text-lg font-headline font-bold text-on-surface">${player.name || '欢乐三张'}</p>
          <p class="text-xs text-primary font-bold flex items-center gap-1">
            <span class="material-symbols-outlined text-xs filled" style="font-variation-settings: 'FILL' 1;">monetization_on</span>
            $ ${(player.chips || 0).toLocaleString()}
          </p>
        </div>
      </div>
      <button class="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors active:scale-90" id="btn-settings">
        <span class="material-symbols-outlined text-primary">settings</span>
      </button>
    </header>

    <!-- 状态提示 -->
    <div class="flex justify-center py-2 z-40">
      <div class="bg-secondary/90 text-white px-5 py-1.5 rounded-full text-sm font-bold backdrop-blur-sm" id="status-banner">
        <span class="inline-block w-2 h-2 rounded-full bg-white mr-2 animate-pulse"></span>
        <span id="status-text">等待玩家...</span>
      </div>
    </div>

    <!-- 游戏桌面 -->
    <main class="flex-1 relative flex items-center justify-center px-6 overflow-visible" style="min-height:0">
      <!-- 牌桌 -->
      <div class="relative w-full max-w-[380px] aspect-[4/5] bg-table-felt rounded-[140px] shadow-[inset_0_0_80px_rgba(0,0,0,0.3),0_16px_48px_rgba(0,0,0,0.2)] flex items-center justify-center border-[12px] border-tertiary-dim overflow-visible" id="poker-table">

        <!-- 奖池 -->
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-10" id="pot-area">
          <div class="bg-on-surface/70 text-white px-6 py-2 rounded-full text-base font-headline font-extrabold backdrop-blur-sm border border-white/10" id="pot-label">
            奖池：<span id="pot-amount">${(game.pot || 0).toLocaleString()}</span>
          </div>
          <div class="text-xs text-white/70 font-bold mt-1" id="bet-info">
            底注 ${(game.ante || 0).toLocaleString()} · 跟注 ${((game.currentBet || 0)).toLocaleString()}
          </div>
          <!-- 筹码堆 -->
          <div id="pot-chips"></div>
        </div>

        <!-- 玩家座位容器 -->
        <div id="seats-container" class="absolute inset-0"></div>
      </div>
    </main>

    <!-- 手牌区域 -->
    <div class="relative z-30 flex justify-center py-2" id="hand-cards-area" style="flex-shrink:0">
    </div>

    <!-- 底部操作区 -->
    <div class="bg-surface/95 backdrop-blur-md px-4 py-3 z-40 border-t border-surface-container" id="action-bar" style="flex-shrink:0;padding-bottom:max(12px,env(safe-area-inset-bottom))">
    </div>
  `;

  // 初始化
  setTimeout(() => _initTable(page), 0);

  return page;
}

function _initTable(page) {
  _renderSeats(page);
  _renderHandCards(page);
  _updateStatus(page);
  _renderPotChips(page);
  _renderActionBar(page);
  _bindActions(page);

  // 等比缩放牌桌以适应屏幕
  _adjustTableScale(page);
  const ro = new ResizeObserver(() => _adjustTableScale(page));
  const mainEl = page.querySelector('main');
  if (mainEl) ro.observe(mainEl);

  // 监听游戏状态变化
  const unsubscribe = store.on('game', () => {
    _renderSeats(page);
    _renderHandCards(page);
    _updateStatus(page);
    _updatePot(page);
    _renderActionBar(page);
    // 检测最新动作并播放动画
    _handleLastAction(page);
  });

  // 页面销毁时清理
  page._cleanup = () => {
    unsubscribe();
    ro.disconnect();
  };
}

/** 根据可用空间等比缩放牌桌，确保操作按钮在小屏手机上可见 */
function _adjustTableScale(page) {
  const main = page.querySelector('main');
  const table = page.querySelector('#poker-table');
  if (!main || !table) return;

  // 先重置缩放，获取牌桌自然尺寸
  table.style.transform = '';
  table.style.marginTop = '';
  table.style.marginBottom = '';

  const availableH = main.clientHeight;
  const tableH = table.offsetHeight;

  if (tableH > 0 && tableH > availableH * 0.95) {
    // 牌桌超出可用空间，需要缩放
    const scale = (availableH * 0.92) / tableH;
    const clampedScale = Math.max(scale, 0.45);
    table.style.transform = `scale(${clampedScale})`;
    table.style.transformOrigin = 'center center';
    // 用负外边距补偿 scale 缩小后的空白
    const reducedH = tableH * (1 - clampedScale) / 2;
    table.style.marginTop = `-${reducedH}px`;
    table.style.marginBottom = `-${reducedH}px`;
  }
}

function _renderSeats(page) {
  const container = page.querySelector('#seats-container');
  if (!container) return;
  container.innerHTML = '';

  const players = store.state.game.players || [];
  const myId = store.state.player.id;
  const currentPlayer = store.state.game.currentPlayer;

  // 把自己放在最后面（底部），其他玩家按顺序围绕牌桌
  const others = players.filter(p => p.id !== myId);

  others.forEach((p, i) => {
    if (i >= SEAT_POSITIONS.length) return;
    const pos = SEAT_POSITIONS[i];
    const isCurrentTurn = p.id === currentPlayer;

    const seatEl = renderPlayerSeat(p, isCurrentTurn, false);
    seatEl.style.position = 'absolute';
    if (pos.top) seatEl.style.top = pos.top;
    if (pos.left) seatEl.style.left = pos.left;
    if (pos.right) seatEl.style.right = pos.right;
    if (pos.transform) seatEl.style.transform = pos.transform;

    container.appendChild(seatEl);
  });
}

function _renderHandCards(page) {
  const area = page.querySelector('#hand-cards-area');
  if (!area) return;
  area.innerHTML = '';

  const cards = store.state.game.myCards;
  const hasLooked = store.state.game.hasLooked;

  const handEl = renderHandCards(cards, {
    looked: hasLooked,
    onLook: () => {
      wsClient.send('look_cards');
    }
  });

  area.appendChild(handEl);
}

function _updateStatus(page) {
  const statusText = page.querySelector('#status-text');
  if (!statusText) return;

  const game = store.state.game;
  const myId = store.state.player.id;
  const playerCount = (game.players || []).length;

  if (game.phase === 'waiting') {
    const myState = (game.players || []).find(p => p.id === myId);
    const isReady = myState?.isReady;
    statusText.textContent = isReady
      ? `${playerCount}/6 玩家 · 等待其他人准备...`
      : `${playerCount}/6 玩家 · 请点击准备`;
  } else if (game.phase === 'betting') {
    if (game.currentPlayer === myId) {
      statusText.textContent = '轮到你操作了！';
    } else {
      const current = game.players?.find(p => p.id === game.currentPlayer);
      statusText.textContent = `轮到${current?.name || '对方'}开牌...`;
    }
  } else if (game.phase === 'finished') {
    statusText.textContent = '本局结束！';
  }
}

/** 渲染奖池中心的筹码堆 */
function _renderPotChips(page) {
  const potChipsEl = page.querySelector('#pot-chips');
  if (!potChipsEl) return;
  potChipsEl.innerHTML = '';

  const pot = store.state.game.pot || 0;
  if (pot > 0) {
    const chipStackEl = renderChipStack(pot);
    chipStackEl.classList.add('chip-land');
    potChipsEl.appendChild(chipStackEl);
  }
}

function _updatePot(page) {
  const potEl = page.querySelector('#pot-amount');
  const oldPot = potEl ? parseInt(potEl.textContent.replace(/,/g, '')) || 0 : 0;
  const newPot = store.state.game.pot || 0;

  if (potEl) {
    potEl.textContent = newPot.toLocaleString();

    // 金额变化时，触发脉冲动画
    if (newPot !== oldPot && newPot > 0) {
      const potLabel = page.querySelector('#pot-label');
      if (potLabel) {
        potLabel.classList.remove('pot-pulse');
        // 使用 requestAnimationFrame 强制重排以重新触发动画
        requestAnimationFrame(() => {
          potLabel.classList.add('pot-pulse');
        });
      }
    }
  }

  const betInfo = page.querySelector('#bet-info');
  if (betInfo) {
    const game = store.state.game;
    const ante = (game.ante || 0).toLocaleString();
    const bet = (game.currentBet || 0).toLocaleString();
    betInfo.textContent = `底注 ${ante} · 跟注 ${bet}`;
  }

  // 更新奖池筹码堆
  _renderPotChips(page);
}

/** 处理最新动作，播放筹码飞行动画和浮动提示 */
function _handleLastAction(page) {
  const action = store.state.game.lastAction;
  if (!action || action.timestamp <= _lastActionTimestamp) return;
  _lastActionTimestamp = action.timestamp;

  const playerId = action.playerId;
  if (!playerId) return;

  // 查找玩家座位 DOM 元素
  const seatEl = page.querySelector(`[data-player-id="${playerId}"]`);
  const potArea = page.querySelector('#pot-area');

  // 根据动作类型选择不同效果
  switch (action.type) {
    case 'player_called':
    case 'player_raised':
    case 'player_all_in': {
      // 筹码飞行动画：从玩家座位飞向奖池中心
      if (seatEl && potArea) {
        createFlyingChip(seatEl, potArea, action.amount || store.state.game.currentBet || 100);
      }
      // 浮动文字提示
      const actionTexts = {
        'player_called': { text: '跟注', bg: '#059669', color: '#ffffff' },
        'player_raised': { text: '加注!', bg: '#dc2626', color: '#ffffff' },
        'player_all_in': { text: '全押!!', bg: '#7c3aed', color: '#fbbf24' }
      };
      const info = actionTexts[action.type];
      if (info && seatEl) {
        _showActionFloat(seatEl, info.text, info.bg, info.color);
      }
      break;
    }
    case 'player_folded': {
      if (seatEl) {
        _showActionFloat(seatEl, '弃牌', '#6b7280', '#ffffff');
      }
      break;
    }
  }
}

/** 在座位上方显示浮动操作文字 */
function _showActionFloat(seatEl, text, bgColor, textColor) {
  const float = document.createElement('div');
  float.className = 'action-float';
  float.style.background = bgColor;
  float.style.color = textColor;
  float.style.boxShadow = `0 2px 8px ${bgColor}80`;
  float.textContent = text;

  // 确保座位元素有 relative 定位
  seatEl.style.position = seatEl.style.position || 'relative';
  seatEl.appendChild(float);

  // 动画结束后移除
  float.addEventListener('animationend', () => float.remove());
}

/** 根据游戏阶段动态渲染操作栏 */
function _renderActionBar(page) {
  const bar = page.querySelector('#action-bar');
  if (!bar) return;

  const game = store.state.game;
  const myId = store.state.player.id;
  const myState = (game.players || []).find(p => p.id === myId);
  const isReady = myState?.isReady;

  if (game.phase === 'waiting') {
    // 等待阶段：显示准备按钮
    if (isReady) {
      bar.innerHTML = `
        <div class="flex items-center justify-center gap-3 max-w-[400px] mx-auto">
          <button class="w-full py-4 rounded-2xl bg-surface-container text-on-surface-variant font-bold text-lg" disabled>
            <span class="material-symbols-outlined align-middle mr-2">check_circle</span>已准备，等待其他玩家...
          </button>
        </div>`;
    } else {
      bar.innerHTML = `
        <div class="flex items-center justify-center gap-3 max-w-[400px] mx-auto">
          <button class="w-full py-4 rounded-2xl bg-primary text-on-primary font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95" id="btn-ready">
            <span class="material-symbols-outlined align-middle mr-2 filled" style="font-variation-settings:'FILL' 1;">sports_esports</span>准备
          </button>
        </div>`;
      bar.querySelector('#btn-ready')?.addEventListener('click', () => {
        wsClient.send('player_ready');
      });
    }
  } else {
    // 对局阶段：显示操作按钮
    const isMyTurn = game.currentPlayer === myId && game.phase === 'betting';
    const hasFolded = myState?.hasFolded;
    const hasLooked = myState?.hasLooked || store.state.game.hasLooked;
    const opacity = (isMyTurn && !hasFolded) ? '1' : '0.4';
    const pointer = (isMyTurn && !hasFolded) ? 'auto' : 'none';
    const currentBet = game.currentBet || 100;
    const callCost = hasLooked ? currentBet * 2 : currentBet;
    const compareCost = currentBet * 2;

    // 道具区：不受轮次限制，只要在对局中未弃牌就可用
    const xrayCount = myState?.xrayCards || 0;
    const swapCount = myState?.swapCards || 0;
    const usedXray = myState?.usedXrayThisRound;
    const usedSwap = myState?.usedSwapThisRound;
    const itemsActive = game.phase === 'betting' && !hasFolded;

    bar.innerHTML = `
      ${(xrayCount > 0 || swapCount > 0) ? `
      <div class="flex items-center justify-center gap-2 max-w-[430px] mx-auto mb-2">
        <button class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 duration-200 ${itemsActive && xrayCount > 0 && !usedXray ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 hover:bg-indigo-500/30' : 'bg-surface-container text-on-surface-variant/40 cursor-not-allowed'}" id="btn-xray" ${!itemsActive || xrayCount <= 0 || usedXray ? 'disabled' : ''}>
          <span style="font-size:16px">🔍</span>
          <span>透视卡</span>
          <span class="ml-0.5 px-1.5 py-0.5 rounded-full bg-white/10 text-[10px]">${xrayCount}</span>
        </button>
        <button class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 duration-200 ${itemsActive && swapCount > 0 && !usedSwap && hasLooked ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 hover:bg-emerald-500/30' : 'bg-surface-container text-on-surface-variant/40 cursor-not-allowed'}" id="btn-swap" ${!itemsActive || swapCount <= 0 || usedSwap || !hasLooked ? 'disabled' : ''}>
          <span style="font-size:16px">🔄</span>
          <span>换牌卡</span>
          <span class="ml-0.5 px-1.5 py-0.5 rounded-full bg-white/10 text-[10px]">${swapCount}</span>
        </button>
      </div>` : ''}
      <div class="flex items-center justify-center gap-2 max-w-[430px] mx-auto" style="opacity:${opacity};pointer-events:${pointer}">
        <button class="flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl bg-surface-container hover:bg-surface-container-high transition-all active:scale-95 duration-200" id="btn-fold">
          <span class="material-symbols-outlined text-on-surface-variant">close</span>
          <span class="text-xs font-bold text-on-surface-variant">弃牌</span>
        </button>
        <button class="flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl bg-tertiary/15 hover:bg-tertiary/25 transition-all active:scale-95 duration-200 border-2 border-tertiary/30" id="btn-call">
          <span class="material-symbols-outlined text-tertiary">add</span>
          <span class="text-[10px] font-bold text-tertiary">跟${callCost.toLocaleString()}</span>
        </button>
        <button class="flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl bg-primary-container/30 hover:bg-primary-container/50 transition-all active:scale-95 duration-200 border-2 border-primary-container" id="btn-raise">
          <span class="material-symbols-outlined text-primary">trending_up</span>
          <span class="text-xs font-bold text-primary">加注</span>
        </button>
        ${hasLooked ? `
        <button class="flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl bg-error/15 hover:bg-error/25 transition-all active:scale-95 duration-200 border-2 border-error/30" id="btn-compare">
          <span class="material-symbols-outlined text-error">compare_arrows</span>
          <span class="text-[10px] font-bold text-error">比${compareCost.toLocaleString()}</span>
        </button>` : ''}
        <button class="flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl bg-secondary/15 hover:bg-secondary/25 transition-all active:scale-95 duration-200 border-2 border-secondary/30" id="btn-allin">
          <span class="material-symbols-outlined text-secondary filled" style="font-variation-settings:'FILL' 1;">rocket_launch</span>
          <span class="text-xs font-bold text-secondary">全押</span>
        </button>
      </div>`;
    _bindActions(page);
  }
}

function _bindActions(page) {
  page.querySelector('#btn-fold')?.addEventListener('click', () => {
    wsClient.send('player_action', { action: 'fold' });
  });

  page.querySelector('#btn-call')?.addEventListener('click', () => {
    wsClient.send('player_action', { action: 'call' });
  });

  page.querySelector('#btn-raise')?.addEventListener('click', () => {
    const currentBet = store.state.game.currentBet || 100;
    wsClient.send('player_action', { action: 'raise', amount: currentBet * 2 });
  });

  page.querySelector('#btn-allin')?.addEventListener('click', () => {
    wsClient.send('player_action', { action: 'all_in' });
  });

  // 比牌按钮
  page.querySelector('#btn-compare')?.addEventListener('click', () => {
    _showCompareDialog(page);
  });

  page.querySelector('#btn-settings')?.addEventListener('click', () => {
    wsClient.send('leave_room');
    router.navigate('/');
  });

  // 道具按钮
  page.querySelector('#btn-xray')?.addEventListener('click', () => {
    _showXrayDialog(page);
  });
  page.querySelector('#btn-swap')?.addEventListener('click', () => {
    _showSwapDialog(page);
  });
}

/** 比牌对手选择弹窗 */
function _showCompareDialog(page) {
  const game = store.state.game;
  const myId = store.state.player.id;
  const targets = (game.players || []).filter(p =>
    p.id !== myId && !p.hasFolded && !p.isAllIn
  );

  if (targets.length === 0) {
    _showTableToast('没有可比牌的对手');
    return;
  }

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';

  overlay.innerHTML = `
    <div style="background:var(--md-sys-color-surface, #1a1a2e);border-radius:20px;padding:20px;width:85%;max-width:340px;box-shadow:0 16px 48px rgba(0,0,0,0.5);">
      <h3 style="text-align:center;font-size:18px;font-weight:800;color:var(--md-sys-color-on-surface, #fff);margin-bottom:16px;">
        <span class="material-symbols-outlined" style="vertical-align:middle;margin-right:4px;color:var(--md-sys-color-error, #ef4444);">compare_arrows</span>
        选择比牌对手
      </h3>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${targets.map(t => `
          <button class="compare-target" data-id="${t.id}" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:14px;background:rgba(255,255,255,0.06);border:2px solid rgba(255,255,255,0.1);cursor:pointer;transition:all 0.2s;color:var(--md-sys-color-on-surface, #fff);">
            <img src="${getAvatarUrl(t.avatar || t.name)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;" />
            <div style="flex:1;text-align:left;">
              <div style="font-weight:700;font-size:14px;">${t.name}</div>
              <div style="font-size:11px;opacity:0.6;">筹码 ${(t.chips || 0).toLocaleString()}</div>
            </div>
            <span class="material-symbols-outlined" style="color:var(--md-sys-color-error, #ef4444);">swords</span>
          </button>
        `).join('')}
      </div>
      <button id="compare-cancel" style="width:100%;margin-top:12px;padding:10px;border-radius:12px;background:rgba(255,255,255,0.08);border:none;color:rgba(255,255,255,0.5);font-weight:600;font-size:13px;cursor:pointer;">取消</button>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#compare-cancel')?.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelectorAll('.compare-target').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.id;
      wsClient.send('player_compare', { targetId });
      overlay.remove();
    });
  });
}

function _showTableToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:10000;background:#333;color:#fff;padding:10px 24px;border-radius:24px;font-size:14px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.3);animation:fadeInOut 2.5s ease;';
  toast.textContent = message;
  const style = document.createElement('style');
  style.textContent = '@keyframes fadeInOut{0%{opacity:0;transform:translateX(-50%) translateY(-8px)}10%{opacity:1;transform:translateX(-50%)}80%{opacity:1}100%{opacity:0;transform:translateX(-50%) translateY(-8px)}}';
  toast.appendChild(style);
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

/** 透视卡目标选择弹窗 */
function _showXrayDialog(page) {
  const game = store.state.game;
  const myId = store.state.player.id;
  const targets = (game.players || []).filter(p =>
    p.id !== myId && !p.hasFolded
  );

  if (targets.length === 0) {
    _showTableToast('没有可透视的对手');
    return;
  }

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';

  overlay.innerHTML = `
    <div style="background:var(--md-sys-color-surface, #1a1a2e);border-radius:20px;padding:20px;width:85%;max-width:340px;box-shadow:0 16px 48px rgba(0,0,0,0.5);">
      <h3 style="text-align:center;font-size:18px;font-weight:800;color:var(--md-sys-color-on-surface, #fff);margin-bottom:16px;">
        🔍 选择透视目标
      </h3>
      <p style="text-align:center;font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:12px;">随机窥探对手一张牌</p>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${targets.map(t => `
          <button class="xray-target" data-id="${t.id}" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:14px;background:rgba(99,102,241,0.1);border:2px solid rgba(99,102,241,0.3);cursor:pointer;transition:all 0.2s;color:var(--md-sys-color-on-surface, #fff);">
            <img src="${getAvatarUrl(t.avatar || t.name)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;" />
            <div style="flex:1;text-align:left;">
              <div style="font-weight:700;font-size:14px;">${t.name}</div>
              <div style="font-size:11px;opacity:0.6;">筹码 ${(t.chips || 0).toLocaleString()}</div>
            </div>
            <span style="font-size:18px;">👁️</span>
          </button>
        `).join('')}
      </div>
      <button id="xray-cancel" style="width:100%;margin-top:12px;padding:10px;border-radius:12px;background:rgba(255,255,255,0.08);border:none;color:rgba(255,255,255,0.5);font-weight:600;font-size:13px;cursor:pointer;">取消</button>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('#xray-cancel')?.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelectorAll('.xray-target').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.id;
      wsClient.send('use_xray', { targetId });
      overlay.remove();
    });
  });
}

/** 换牌卡手牌选择弹窗 */
function _showSwapDialog(page) {
  const game = store.state.game;
  const myCards = game.myCards || [];

  if (myCards.length === 0) {
    _showTableToast('没有可替换的手牌');
    return;
  }

  const getCardHtml = (c) => {
    const suit = c.symbol || { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }[c.suit] || '?';
    const rank = c.display || String(c.value || '');
    const isRed = c.suit === 'hearts' || c.suit === 'diamonds';
    const color = isRed ? '#ef4444' : '#1e293b';

    return `
      <div class="poker-card ${isRed ? 'red' : 'black'} relative flex items-center justify-center bg-white rounded-lg shadow-sm flex-shrink-0" style="width:64px;height:90px;color:${color};border:2px solid rgba(0,0,0,0.1);">
        <span class="absolute top-1 left-1.5 font-headline font-extrabold leading-none" style="font-size:12px;">${rank}</span>
        <span class="text-3xl select-none" style="line-height:1;">${suit}</span>
      </div>
    `;
  };

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';

  overlay.innerHTML = `
    <div style="background:var(--md-sys-color-surface, #1a1a2e);border-radius:24px;padding:24px;width:85%;max-width:340px;box-shadow:0 24px 60px rgba(0,0,0,0.6);">
      <h3 style="text-align:center;font-size:18px;font-weight:900;color:var(--md-sys-color-on-surface, #fff);margin-bottom:8px;display:flex;align-items:center;justify-content:center;gap:6px;">
        <span style="font-size:20px;">🔄</span> 选择要替换的牌
      </h3>
      <p style="text-align:center;font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:20px;">从牌库顶抽一张新牌替换</p>
      <div style="display:flex;gap:12px;justify-content:center;margin-bottom:24px;">
        ${myCards.map((c, i) => {
    return `<button class="swap-card group relative cursor-pointer" data-index="${i}" style="border:none;background:none;padding:0;transition:all 0.2s;" onmouseover="this.style.transform='translateY(-8px) scale(1.05)'" onmouseout="this.style.transform='none'">
            <div style="position:absolute;inset:-4px;background:rgba(16,185,129,0.5);border-radius:12px;filter:blur(6px);opacity:0;transition:opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0"></div>
            <div style="position:relative;">${getCardHtml(c)}</div>
          </button>`;
  }).join('')}
      </div>
      <button id="swap-cancel" style="width:100%;padding:12px;border-radius:12px;background:rgba(255,255,255,0.08);border:none;color:rgba(255,255,255,0.8);font-weight:700;font-size:14px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.12)'" onmouseout="this.style.background='rgba(255,255,255,0.08)'">取消</button>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('#swap-cancel')?.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelectorAll('.swap-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const cardIndex = parseInt(btn.dataset.index);
      wsClient.send('use_swap', { cardIndex });
      overlay.remove();
    });
  });
}
