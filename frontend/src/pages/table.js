/**
 * 牌桌页面 — 基于 ui/optimized_pot_layout_table 设计
 * 包含绿色牌桌、玩家座位、手牌、操作按钮
 */
import { store } from '../store.js';
import { wsClient } from '../ws.js';
import { router } from '../router.js';
import { renderHandCards } from '../components/card.js';
import { renderPlayerSeat, SEAT_POSITIONS } from '../components/playerSeat.js';
import { getAvatarUrl } from '../utils/avatarUtil.js';

export function renderTable() {
  const game = store.state.game;
  const player = store.state.player;

  const page = document.createElement('div');
  page.className = 'fixed inset-0 bg-surface flex flex-col max-w-[430px] mx-auto';
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
    <main class="flex-1 relative flex items-center justify-center px-6 overflow-visible">
      <!-- 牌桌 -->
      <div class="relative w-full max-w-[380px] aspect-[4/5] bg-table-felt rounded-[140px] shadow-[inset_0_0_80px_rgba(0,0,0,0.3),0_16px_48px_rgba(0,0,0,0.2)] flex items-center justify-center border-[12px] border-tertiary-dim overflow-visible" id="poker-table">

        <!-- 奖池 -->
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-10">
          <div class="bg-on-surface/70 text-white px-6 py-2 rounded-full text-base font-headline font-extrabold backdrop-blur-sm border border-white/10">
            奖池：<span id="pot-amount">${(game.pot || 0).toLocaleString()}</span>
          </div>
          <!-- 筹码装饰 -->
          <div class="flex gap-1">
            <div class="w-8 h-8 rounded-full bg-primary-container border-3 border-primary-dim shadow-lg rotate-12 -translate-x-1"></div>
            <div class="w-8 h-8 rounded-full bg-secondary border-3 border-secondary/80 shadow-lg"></div>
            <div class="w-8 h-8 rounded-full bg-tertiary-fixed border-3 border-tertiary-dim shadow-lg -translate-y-1"></div>
          </div>
        </div>

        <!-- 玩家座位容器 -->
        <div id="seats-container" class="absolute inset-0"></div>
      </div>
    </main>

    <!-- 手牌区域 -->
    <div class="relative z-30 flex justify-center py-4 -mt-8" id="hand-cards-area">
    </div>

    <!-- 底部操作区 -->
    <div class="bg-surface/95 backdrop-blur-md px-4 py-4 z-40 border-t border-surface-container" id="action-bar">
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
  _renderActionBar(page);
  _bindActions(page);

  // 监听游戏状态变化
  const unsubscribe = store.on('game', () => {
    _renderSeats(page);
    _renderHandCards(page);
    _updateStatus(page);
    _updatePot(page);
    _renderActionBar(page);
  });

  // 页面销毁时清理
  page._cleanup = unsubscribe;
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

function _updatePot(page) {
  const potEl = page.querySelector('#pot-amount');
  if (potEl) {
    potEl.textContent = (store.state.game.pot || 0).toLocaleString();
  }
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
    const opacity = isMyTurn ? '1' : '0.4';
    const pointer = isMyTurn ? 'auto' : 'none';
    bar.innerHTML = `
      <div class="flex items-center justify-center gap-3 max-w-[400px] mx-auto" style="opacity:${opacity};pointer-events:${pointer}">
        <button class="flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl bg-surface-container hover:bg-surface-container-high transition-all active:scale-95 duration-200" id="btn-fold">
          <span class="material-symbols-outlined text-on-surface-variant">close</span>
          <span class="text-xs font-bold text-on-surface-variant">弃牌</span>
        </button>
        <button class="flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl bg-tertiary/15 hover:bg-tertiary/25 transition-all active:scale-95 duration-200 border-2 border-tertiary/30" id="btn-call">
          <span class="material-symbols-outlined text-tertiary">add</span>
          <span class="text-xs font-bold text-tertiary">跟注</span>
        </button>
        <button class="flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl bg-primary-container/30 hover:bg-primary-container/50 transition-all active:scale-95 duration-200 border-2 border-primary-container" id="btn-raise">
          <span class="material-symbols-outlined text-primary">trending_up</span>
          <span class="text-xs font-bold text-primary">加注</span>
        </button>
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

  page.querySelector('#btn-settings')?.addEventListener('click', () => {
    wsClient.send('leave_room');
    router.navigate('/');
  });
}
