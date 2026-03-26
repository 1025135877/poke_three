/**
 * 排行榜页面 — 对接后端 API
 */
import { store } from '../store.js';
import { router } from '../router.js';
import { getAvatarUrl } from '../utils/avatarUtil.js';

export function renderLeaderboard() {
  const player = store.state.player;

  const page = document.createElement('div');
  page.className = 'page';
  page.id = 'leaderboard-page';

  // 先渲染骨架屏
  _renderSkeleton(page, player);

  // 异步加载数据
  _fetchLeaderboard().then(data => {
    if (data) {
      _renderContent(page, player, data);
    }
  });

  return page;
}

async function _fetchLeaderboard() {
  try {
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) headers['Authorization'] = token;

    const res = await fetch('/api/auth/leaderboard?limit=50', { headers });
    const json = await res.json();
    if (json.code === 0) return json.data;
    return null;
  } catch (e) {
    console.error('排行榜数据加载失败:', e);
    return null;
  }
}

function _renderSkeleton(page, player) {
  page.innerHTML = `
    <header class="flex items-center justify-between px-5 py-4">
      <div class="w-8 h-8"></div>
      <h1 class="text-xl font-headline font-extrabold text-on-surface">排行榜</h1>
      <div class="w-8 h-8"></div>
    </header>
    <main class="px-5 space-y-5 pb-28">
      <div class="flex items-center justify-center py-16">
        <span class="inline-block w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></span>
        <span class="ml-3 text-on-surface-variant">加载中...</span>
      </div>
    </main>
  `;
}

function _renderContent(page, player, data) {
  const rankings = data.rankings || [];
  const myRank = data.myRank || '-';
  const totalChips = data.totalChips || 0;
  const totalPlayers = data.totalPlayers || 0;

  // 确保至少有 3 条数据用于领奖台
  const top3 = rankings.slice(0, 3);
  const rest = rankings.slice(3);

  // 计算当前用户的胜率
  const myWinRate = player.totalGames > 0
    ? Math.round(player.winGames * 1000 / player.totalGames) / 10
    : 0;

  page.innerHTML = `
    <!-- 顶部栏 -->
    <header class="flex items-center justify-between px-5 py-4">
      <div class="w-8 h-8"></div>
      <h1 class="text-xl font-headline font-extrabold text-on-surface">排行榜</h1>
      <div class="w-8 h-8"></div>
    </header>

    <main class="px-5 space-y-5 pb-28">
      ${top3.length >= 3 ? `
      <!-- 领奖台 -->
      <section class="flex items-end justify-center gap-3 pt-8 pb-4">
        <!-- 第2名 -->
        <div class="flex flex-col items-center">
          <div class="relative mb-2">
            <div class="w-16 h-16 rounded-full border-4 border-outline-variant overflow-hidden bg-surface-container">
              <img src="${getAvatarUrl(top3[1].avatar || top3[1].name)}" alt="" class="w-full h-full object-cover" />
            </div>
            <div class="absolute -bottom-1 -right-1 w-5 h-5 bg-surface-container-high rounded-full flex items-center justify-center text-xs font-bold border border-outline-variant">2</div>
          </div>
          <div class="bg-surface-container-high rounded-t-xl px-6 py-6 text-center" style="min-height: 80px;">
            <p class="text-sm font-bold text-on-surface">${top3[1].name}</p>
            <p class="text-xs text-on-surface-variant mt-1">${_formatChips(top3[1].chips)}</p>
          </div>
        </div>

        <!-- 第1名 -->
        <div class="flex flex-col items-center -mt-6">
          <div class="text-3xl mb-1">🏆</div>
          <div class="relative mb-2">
            <div class="w-20 h-20 rounded-full border-4 border-primary-container overflow-hidden bg-surface-container shadow-lg animate-pulse-glow">
              <img src="${getAvatarUrl(top3[0].avatar || top3[0].name)}" alt="" class="w-full h-full object-cover" />
            </div>
            <div class="absolute -bottom-1 -right-1 w-6 h-6 bg-primary-container rounded-full flex items-center justify-center text-xs font-extrabold text-primary border-2 border-primary">1</div>
          </div>
          <div class="bg-primary-container rounded-t-xl px-8 py-8 text-center" style="min-height: 100px;">
            <p class="text-base font-extrabold text-on-primary-container">${top3[0].name}</p>
            <p class="text-sm text-primary font-bold mt-1">${_formatChips(top3[0].chips)}</p>
          </div>
        </div>

        <!-- 第3名 -->
        <div class="flex flex-col items-center">
          <div class="relative mb-2">
            <div class="w-16 h-16 rounded-full border-4 border-secondary-container overflow-hidden bg-surface-container">
              <img src="${getAvatarUrl(top3[2].avatar || top3[2].name)}" alt="" class="w-full h-full object-cover" />
            </div>
            <div class="absolute -bottom-1 -right-1 w-5 h-5 bg-secondary-container rounded-full flex items-center justify-center text-xs font-bold text-secondary border border-secondary">3</div>
          </div>
          <div class="bg-secondary-container/30 rounded-t-xl px-6 py-6 text-center" style="min-height: 70px;">
            <p class="text-sm font-bold text-on-surface">${top3[2].name}</p>
            <p class="text-xs text-on-surface-variant mt-1">${_formatChips(top3[2].chips)}</p>
          </div>
        </div>
      </section>
      ` : ''}

      <!-- 统计概览 -->
      <section class="card-elevated flex items-center rounded-full px-6 py-4">
        <div class="flex-1 flex items-center gap-3">
          <div class="w-10 h-10 bg-primary-container rounded-full flex items-center justify-center">
            <span class="material-symbols-outlined text-primary filled" style="font-variation-settings: 'FILL' 1;">monetization_on</span>
          </div>
          <div>
            <p class="text-xs text-on-surface-variant">总奖池</p>
            <p class="text-lg font-headline font-extrabold text-on-surface">${_formatChips(totalChips)}</p>
          </div>
        </div>
        <div class="w-px h-10 bg-outline-variant/20"></div>
        <div class="flex-1 flex items-center gap-3 justify-end">
          <div class="w-10 h-10 bg-tertiary/15 rounded-full flex items-center justify-center">
            <span class="material-symbols-outlined text-tertiary filled" style="font-variation-settings: 'FILL' 1;">groups</span>
          </div>
          <div>
            <p class="text-xs text-on-surface-variant">注册玩家</p>
            <p class="text-lg font-headline font-extrabold text-on-surface">${totalPlayers.toLocaleString()}</p>
          </div>
        </div>
      </section>

      ${rest.length > 0 ? `
      <!-- 顶级竞争者 -->
      <section>
        <h3 class="text-lg font-headline font-extrabold text-on-surface mb-3">顶级竞争者</h3>
        <div class="space-y-3">
          ${rest.map(p => `
            <div class="card-elevated flex items-center gap-4 px-5 py-4 rounded-2xl">
              <span class="text-lg font-headline font-bold text-on-surface-variant w-6">${p.rank}</span>
              <div class="w-12 h-12 rounded-full overflow-hidden bg-surface-container border-2 border-outline-variant/20">
                <img src="${getAvatarUrl(p.avatar || p.name)}" alt="" class="w-full h-full object-cover" />
              </div>
              <div class="flex-1">
                <p class="text-sm font-bold text-on-surface">${p.name}</p>
                <p class="text-xs text-on-surface-variant">胜率: ${p.winRate}%</p>
              </div>
              <div class="text-right">
                <p class="text-base font-headline font-extrabold text-on-surface">${_formatChips(p.chips)}</p>
                <p class="text-[10px] text-on-surface-variant uppercase tracking-wider">CHIPS</p>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
      ` : ''}

      <!-- 我的排名 -->
      <section class="card-elevated rounded-2xl px-5 py-4 border-2 border-primary-container flex items-center gap-4 bg-primary-container/10">
        <span class="text-lg font-headline font-extrabold text-primary w-6">${myRank}</span>
        <div class="w-12 h-12 rounded-full overflow-hidden bg-surface-container border-3 border-primary-container">
          <img src="${getAvatarUrl(player.avatar || player.name)}" alt="" class="w-full h-full object-cover" />
        </div>
        <div class="flex-1">
          <p class="text-sm font-bold text-on-surface">我 (${player.name})</p>
          <div class="tag tag-yellow text-[10px] mt-0.5 inline-block">当前排名</div>
        </div>
        <div class="text-right">
          <p class="text-base font-headline font-extrabold text-primary">${_formatChips(player.chips)}</p>
        </div>
      </section>
    </main>
  `;
}

function _formatChips(chips) {
  if (chips >= 1000000) return (chips / 1000000).toFixed(1) + 'M';
  if (chips >= 1000) return (chips / 1000).toFixed(1) + 'K';
  return Number(chips).toLocaleString();
}
