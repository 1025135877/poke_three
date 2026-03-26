/**
 * 结算页面 — 基于 ui/match_result_no_menu 设计
 */
import { store } from '../store.js';
import { wsClient } from '../ws.js';
import { router } from '../router.js';
import { renderCard } from '../components/card.js';
import { getAvatarUrl } from '../utils/avatarUtil.js';

// 牌型中文显示
const HAND_TYPE_DISPLAY = {
  '豹子': { label: '豹子', color: 'bg-secondary text-white' },
  '同花顺': { label: '同花顺', color: 'bg-primary text-on-primary' },
  '同花': { label: '同花', color: 'bg-tertiary text-on-tertiary' },
  '顺子': { label: '顺子', color: 'bg-primary-container text-on-primary-container' },
  '对子': { label: '对子', color: 'bg-surface-container-highest text-on-surface' },
  '高牌': { label: '高牌', color: 'bg-surface-container text-on-surface-variant' }
};

export function renderResult() {
  const result = store.state.result;
  const player = store.state.player;

  if (!result) {
    router.navigate('/');
    return document.createElement('div');
  }

  const isWinner = result.winnerId === player.id;
  const winnerResult = result.results?.find(r => r.isWinner);
  const losers = result.results?.filter(r => !r.isWinner) || [];

  const page = document.createElement('div');
  page.className = 'page bg-surface';
  page.id = 'result-page';

  page.innerHTML = `
    <!-- 顶部栏 -->
    <header class="flex items-center justify-between px-5 py-3">
      <div class="flex items-center gap-2">
        <img src="${getAvatarUrl(player.avatar || player.name)}" alt="" class="w-8 h-8 rounded-full border-2 border-primary-container" />
        <span class="text-lg font-headline font-bold">欢乐三张</span>
      </div>
      <button class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center">
        <span class="material-symbols-outlined text-on-surface-variant text-sm">settings</span>
      </button>
    </header>

    <!-- 赢家展示 -->
    <section class="flex flex-col items-center py-6 px-5">
      <!-- 金币特效 -->
      <div class="relative mb-2">
        <span class="absolute -left-6 top-2 text-3xl animate-float" style="animation-delay: -0.5s;">💰</span>
        <span class="absolute -right-6 top-2 text-3xl animate-float" style="animation-delay: -1s;">💰</span>
      </div>

      <!-- 赢家头像 -->
      <div class="relative mb-4">
        <div class="w-28 h-28 rounded-full border-6 border-primary-container overflow-hidden bg-surface-container shadow-2xl animate-bounce-in">
          <img src="${getAvatarUrl(result.winnerName)}" alt="${result.winnerName}" class="w-full h-full object-cover" />
        </div>
        <div class="absolute -top-4 left-1/2 -translate-x-1/2 text-4xl">🏆</div>
      </div>

      <!-- 赢家信息 -->
      <h2 class="text-3xl font-headline font-extrabold ${isWinner ? 'text-secondary' : 'text-primary'} animate-bounce-in" style="animation-delay: 0.2s;">
        ${isWinner ? '大获全胜！' : `${result.winnerName} 获胜`}
      </h2>
      <div class="mt-2 bg-primary-container px-6 py-2 rounded-full flex items-center gap-2 shadow-md animate-bounce-in" style="animation-delay: 0.4s;">
        <span class="material-symbols-outlined filled text-primary" style="font-variation-settings: 'FILL' 1;">stars</span>
        <span class="text-xl font-headline font-extrabold text-on-primary-container">
          + ${(result.pot || 0).toLocaleString()}
        </span>
      </div>
    </section>

    <!-- 赢家牌型 -->
    <section class="mx-5 mb-4">
      <div class="card-elevated relative">
        <div class="absolute -top-3 right-4 tag tag-red text-xs">赢家牌型</div>
        <h3 class="text-xl font-headline font-extrabold text-center mb-4">
          ${result.winnerHandType} ${_getHandLabel(result.winnerHand)}
        </h3>
        <div class="flex items-center justify-center gap-3" id="winner-cards">
          <!-- 赢家手牌将动态插入 -->
        </div>
      </div>
    </section>

    <!-- 其他玩家结果 -->
    <section class="mx-5 mb-4">
      <div class="card">
        ${losers.map(p => `
          <div class="flex items-center justify-between py-3 ${p !== losers[losers.length - 1] ? 'border-b border-outline-variant/15' : ''}">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full overflow-hidden bg-surface-container-high border-2 border-outline-variant/20">
                <img src="${getAvatarUrl(p.playerName)}" alt="" class="w-full h-full object-cover" />
              </div>
              <span class="text-sm font-bold text-on-surface">${p.playerName}</span>
            </div>
            <div class="text-right">
              <div class="text-xs text-on-surface-variant">${p.hasFolded ? '弃牌' : (p.handType || '')}</div>
              <div class="text-sm font-bold text-secondary">- ${Math.abs(p.betAmount || 0).toLocaleString()}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- 结算详情 -->
    <section class="mx-5 mb-6">
      <div class="card">
        <h4 class="text-base font-headline font-bold text-on-surface mb-3 flex items-center gap-2">
          <span class="material-symbols-outlined text-primary">receipt_long</span>
          本局结算详情
        </h4>
        <div class="space-y-0">
          <div class="grid grid-cols-3 gap-2 text-xs text-on-surface-variant font-bold py-2 border-b border-outline-variant/10">
            <span>玩家</span>
            <span class="text-center">牌型</span>
            <span class="text-right">盈亏</span>
          </div>
          ${(result.results || []).map(r => `
            <div class="grid grid-cols-3 gap-2 py-2.5 text-sm ${r.isWinner ? 'font-bold text-primary' : 'text-on-surface'}">
              <span class="truncate">${r.isWinner ? '赢家：' : ''}${r.playerId === player.id ? '我' : r.playerName}</span>
              <span class="text-center">
                ${r.hasFolded ? '<span class="text-on-surface-variant text-xs">弃牌</span>' : `<span class="tag ${(HAND_TYPE_DISPLAY[r.handType]?.color) || 'bg-surface-container text-on-surface'} text-[10px] px-2">${r.handType || '-'}</span>`}
              </span>
              <span class="text-right ${r.profit > 0 ? 'text-tertiary' : 'text-secondary'}">
                ${r.profit > 0 ? '+' : ''}${_formatAmount(r.profit || 0)}
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- 底部操作 -->
    <section class="px-5 pb-8 space-y-3">
      <button class="btn-primary w-full flex items-center justify-center gap-2 text-lg py-4" id="btn-play-again">
        <span class="material-symbols-outlined filled" style="font-variation-settings: 'FILL' 1;">play_circle</span>
        再来一局
      </button>
      <button class="btn-ghost w-full flex items-center justify-center gap-2 text-base py-3" id="btn-back-lobby">
        <span class="material-symbols-outlined filled" style="font-variation-settings: 'FILL' 1;">home</span>
        返回大厅
      </button>
    </section>
  `;

  // 渲染赢家手牌
  setTimeout(() => {
    const winnerCardsEl = page.querySelector('#winner-cards');
    if (winnerCardsEl && result.winnerHand) {
      result.winnerHand.forEach((card, i) => {
        const cardEl = renderCard(card, { size: 'sm', animate: true });
        cardEl.style.animationDelay = `${i * 0.15}s`;
        winnerCardsEl.appendChild(cardEl);
      });
    }

    // 绑定按钮
    page.querySelector('#btn-play-again')?.addEventListener('click', () => {
      wsClient.send('play_again');
      store.set('result', null);
      router.navigate('/table');
    });

    page.querySelector('#btn-back-lobby')?.addEventListener('click', () => {
      wsClient.send('leave_room');
      store.set('result', null);
      router.navigate('/');
    });
  }, 0);

  return page;
}

function _getHandLabel(hand) {
  if (!hand || hand.length === 0) return '';
  return `(${hand.map(c => c.display).join('')})`;
}

function _formatAmount(amount) {
  const abs = Math.abs(amount);
  if (abs >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
  if (abs >= 1000) return (amount / 1000).toFixed(1) + 'K';
  return amount.toLocaleString();
}
