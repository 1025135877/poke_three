/**
 * 个人中心页面 — 动态加载玩家数据
 */
import { store } from '../store.js';
import { router } from '../router.js';
import { getAvatarUrl } from '../utils/avatarUtil.js';

/**
 * 成就勋章定义（根据玩家数据动态解锁）
 */
const BADGES = [
  { id: 'first_win', name: '初战告捷', icon: 'military_tech', color: 'bg-secondary/10 text-secondary', condition: p => p.winGames >= 1 },
  { id: 'ten_games', name: '牌坛新秀', icon: 'emoji_events', color: 'bg-primary-container/30 text-primary', condition: p => p.totalGames >= 10 },
  { id: 'fifty_wins', name: '常胜将军', icon: 'workspace_premium', color: 'bg-tertiary/10 text-tertiary', condition: p => p.winGames >= 50 },
  { id: 'millionaire', name: '百万富翁', icon: 'savings', color: 'bg-primary-container/30 text-primary', condition: p => p.chips >= 1000000 },
  { id: 'high_roller', name: '赌神降临', icon: 'star', color: 'bg-secondary/10 text-secondary', condition: p => p.maxWin >= 500000 },
  { id: 'veteran', name: '身经百战', icon: 'shield', color: 'bg-on-surface/10 text-on-surface', condition: p => p.totalGames >= 100 },
];

/**
 * 房间类型中文名映射
 */
const ROOM_TYPE_MAP = {
  'beginner': '新手场',
  'normal': '普通场',
  'vip': '富豪场'
};

export function renderProfile() {
  const page = document.createElement('div');
  page.className = 'page';
  page.id = 'profile-page';

  // 先渲染骨架屏，然后异步加载数据
  renderSkeleton(page);
  loadProfileData(page);

  return page;
}

/**
 * 渲染加载骨架屏
 */
function renderSkeleton(page) {
  page.innerHTML = `
    <header class="flex items-center justify-between px-5 py-4">
      <div class="w-8 h-8"></div>
      <h1 class="text-xl font-headline font-extrabold text-on-surface">个人中心</h1>
      <button class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center" id="profile-logout-btn">
        <span class="material-symbols-outlined text-on-surface-variant text-sm">logout</span>
      </button>
    </header>
    <main class="px-5 space-y-5 pb-28">
      <div class="card-elevated rounded-2xl p-5 animate-pulse">
        <div class="flex items-center gap-4">
          <div class="w-20 h-20 rounded-full bg-surface-container"></div>
          <div class="flex-1 space-y-2">
            <div class="h-6 bg-surface-container rounded w-32"></div>
            <div class="h-4 bg-surface-container rounded w-48"></div>
          </div>
        </div>
      </div>
    </main>
  `;

  // 退出登录
  page.querySelector('#profile-logout-btn')?.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('playerId');
    store.reset();
    router.navigate('/auth');
  });
}

/**
 * 异步加载玩家数据并渲染完整页面
 */
async function loadProfileData(page) {
  const token = localStorage.getItem('token');
  if (!token) {
    router.navigate('/auth');
    return;
  }

  let playerData = null;
  let records = [];
  let playerItems = {};

  try {
    // 并行请求玩家信息、游戏记录和道具
    const [meRes, recordsRes, itemsRes] = await Promise.all([
      fetch('/api/auth/me', { headers: { 'Authorization': token } }),
      fetch('/api/auth/records?limit=20', { headers: { 'Authorization': token } }),
      fetch('/api/auth/items', { headers: { 'Authorization': token } })
    ]);

    const meJson = await meRes.json();
    const recordsJson = await recordsRes.json();
    const itemsJson = await itemsRes.json();

    if (meJson.code === 0) playerData = meJson.data;
    if (recordsJson.code === 0) records = recordsJson.data || [];
    if (itemsJson.code === 0) playerItems = itemsJson.data || {};
  } catch (e) {
    console.error('加载用户数据失败:', e);
  }

  if (!playerData) {
    // 使用 store 中的基础数据
    const p = store.state.player;
    playerData = {
      playerId: p.id, name: p.name || '未知', chips: p.chips || 0,
      diamonds: p.diamonds || 0, totalGames: 0, winGames: 0, maxWin: 0
    };
  }

  // 同步更新 store
  store.update('player', {
    chips: playerData.chips,
    diamonds: playerData.diamonds,
    totalGames: playerData.totalGames,
    winGames: playerData.winGames,
    maxWin: playerData.maxWin
  });

  renderFullProfile(page, playerData, records, playerItems);
}

/**
 * 渲染完整个人中心
 */
function renderFullProfile(page, player, records, items = {}) {
  const winRate = player.totalGames > 0
    ? ((player.winGames / player.totalGames) * 100).toFixed(1)
    : '0.0';

  const unlockedBadges = BADGES.filter(b => b.condition(player));
  const lockedBadges = BADGES.filter(b => !b.condition(player));

  const main = page.querySelector('main');
  if (!main) return;

  main.innerHTML = `
      <!-- 个人信息卡 -->
      <section class="card-elevated rounded-2xl p-5">
        <div class="flex items-center gap-4">
          <div class="relative">
            <div class="w-20 h-20 rounded-full border-4 border-primary-container overflow-hidden bg-surface-container shadow-lg">
              <img src="${getAvatarUrl(player.avatar || player.name)}" alt="" class="w-full h-full object-cover" />
            </div>
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <h2 class="text-2xl font-headline font-extrabold text-on-surface">${player.name}</h2>
            </div>
            <p class="text-xs text-on-surface-variant mt-0.5">ID: ${player.playerId || '-'}</p>
            <div class="flex gap-2 mt-2">
              ${unlockedBadges.length > 0 ? unlockedBadges.slice(0, 2).map(b =>
    `<span class="tag bg-primary-container/30 text-primary text-[10px] font-bold px-2.5 py-0.5 rounded-full">${b.name}</span>`
  ).join('') : '<span class="text-[10px] text-on-surface-variant">暂无称号</span>'}
            </div>
          </div>
        </div>
      </section>

      <!-- 数据面板 -->
      <section class="flex gap-3">
        <div class="flex-1 card-elevated rounded-2xl py-5 text-center border-2 border-outline-variant/15">
          <p class="text-xs text-on-surface-variant mb-1 font-body">总局数</p>
          <p class="text-3xl font-headline font-extrabold text-on-surface">${player.totalGames.toLocaleString()}</p>
        </div>
        <div class="flex-1 card-elevated rounded-2xl py-5 text-center border-2 border-secondary/20 bg-secondary/5">
          <p class="text-xs text-on-surface-variant mb-1 font-body">总胜率</p>
          <p class="text-3xl font-headline font-extrabold text-secondary">${winRate}%</p>
        </div>
      </section>

      <!-- 余额卡片 -->
      <section class="bg-primary-container rounded-2xl p-6 shadow-lg relative overflow-hidden">
        <div class="relative z-10">
          <div class="flex items-center gap-2 text-on-primary-container/70 text-sm font-body">
            <span class="material-symbols-outlined text-base">account_balance_wallet</span>
            当前余额
          </div>
          <p class="text-4xl font-headline font-extrabold text-on-primary-container mt-1">
            ${player.chips.toLocaleString()}
            <span class="text-lg font-normal">金币</span>
          </p>
          <div class="mt-4 bg-on-primary-container/10 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p class="text-xs text-on-primary-container/60">历史最高获胜</p>
              <p class="text-lg font-headline font-bold text-on-primary-container">+${player.maxWin.toLocaleString()}</p>
            </div>
            <span class="material-symbols-outlined text-on-primary-container/30 text-3xl">military_tech</span>
          </div>
        </div>
        <div class="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full"></div>
      </section>

      <!-- 我的道具 -->
      <section>
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-headline font-extrabold text-on-surface">我的道具</h3>
        </div>
        <div class="flex gap-3">
          ${_renderItemCard('🔍', '透视卡', items.xray_card || 0, '随机窥探对手一张牌')}
          ${_renderItemCard('🔄', '换牌卡', items.swap_card || 0, '盲换手中一张牌')}
        </div>
      </section>

      <!-- 成就勋章 -->
      <section>
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-headline font-extrabold text-on-surface">成就勋章</h3>
          <span class="text-sm text-on-surface-variant">${unlockedBadges.length}/${BADGES.length}</span>
        </div>
        <div class="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          ${unlockedBadges.map(b => _renderBadge(b.name, b.icon, b.color, true)).join('')}
          ${lockedBadges.map(b => _renderBadge(b.name, b.icon, 'bg-surface-container text-on-surface-variant/30', false)).join('')}
        </div>
      </section>

      <!-- 游戏记录 -->
      <section>
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-headline font-extrabold text-on-surface">游戏记录</h3>
          <span class="text-sm text-on-surface-variant">${records.length} 条</span>
        </div>
        ${records.length > 0 ? `
        <div class="card-elevated rounded-2xl overflow-hidden divide-y divide-outline-variant/10">
          ${records.map(r => _renderRecordItem(r)).join('')}
        </div>
        ` : `
        <div class="card-elevated rounded-2xl p-8 text-center">
          <span class="material-symbols-outlined text-on-surface-variant/30 text-5xl mb-2">receipt_long</span>
          <p class="text-sm text-on-surface-variant">暂无游戏记录</p>
          <p class="text-xs text-on-surface-variant/60 mt-1">快去打一局吧！</p>
        </div>
        `}
      </section>

      <!-- 修改密码 -->
      <section class="card-elevated rounded-2xl p-5">
        <button id="btn-change-pwd" class="w-full flex items-center justify-between group">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-tertiary/10 flex items-center justify-center">
              <span class="material-symbols-outlined text-tertiary" style="font-size:20px;">lock</span>
            </div>
            <div class="text-left">
              <p class="text-sm font-bold text-on-surface">修改密码</p>
              <p class="text-[10px] text-on-surface-variant">更新您的登录密码</p>
            </div>
          </div>
          <span class="material-symbols-outlined text-on-surface-variant/40 group-hover:text-on-surface-variant transition-colors">chevron_right</span>
        </button>
      </section>
  `;

  // 绑定修改密码按钮
  setTimeout(() => {
    page.querySelector('#btn-change-pwd')?.addEventListener('click', () => {
      _showChangePasswordModal();
    });
  }, 0);
}

/**
 * 修改密码弹窗
 */
function _showChangePasswordModal() {
  if (document.getElementById('change-pwd-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'change-pwd-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';

  overlay.innerHTML = `
    <div style="background:linear-gradient(145deg,#1a1a2e,#16213e);border-radius:20px;padding:28px 24px;width:90%;max-width:360px;box-shadow:0 16px 48px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.08);">
      <h3 style="font-size:18px;font-weight:800;color:#fff;text-align:center;margin-bottom:20px;">🔐 修改密码</h3>
      <div style="margin-bottom:14px;">
        <label style="display:block;font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:4px;">旧密码</label>
        <input type="password" id="pwd-old" style="width:100%;padding:10px 12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:14px;outline:none;" placeholder="请输入旧密码">
      </div>
      <div style="margin-bottom:14px;">
        <label style="display:block;font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:4px;">新密码</label>
        <input type="password" id="pwd-new" style="width:100%;padding:10px 12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:14px;outline:none;" placeholder="请输入新密码">
      </div>
      <div style="margin-bottom:18px;">
        <label style="display:block;font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:4px;">确认新密码</label>
        <input type="password" id="pwd-confirm" style="width:100%;padding:10px 12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:14px;outline:none;" placeholder="再次输入新密码">
      </div>
      <div id="pwd-error" style="color:#ef4444;font-size:12px;text-align:center;margin-bottom:10px;display:none;"></div>
      <div style="display:flex;gap:10px;">
        <button id="pwd-cancel" style="flex:1;padding:10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);color:#fff;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;">取消</button>
        <button id="pwd-submit" style="flex:1;padding:10px;background:#22c55e;border:none;color:#000;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;">确认修改</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#pwd-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#pwd-submit').addEventListener('click', async () => {
    const oldPwd = overlay.querySelector('#pwd-old').value;
    const newPwd = overlay.querySelector('#pwd-new').value;
    const confirmPwd = overlay.querySelector('#pwd-confirm').value;
    const errEl = overlay.querySelector('#pwd-error');

    if (!oldPwd || !newPwd || !confirmPwd) {
      errEl.textContent = '请填写所有字段'; errEl.style.display = 'block'; return;
    }
    if (newPwd !== confirmPwd) {
      errEl.textContent = '两次密码输入不一致'; errEl.style.display = 'block'; return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token },
        body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd })
      });
      const json = await res.json();
      if (json.code === 0) {
        overlay.remove();
        _showProfileToast('密码修改成功 ✅');
      } else {
        errEl.textContent = json.message || '修改失败'; errEl.style.display = 'block';
      }
    } catch (e) {
      errEl.textContent = '网络错误'; errEl.style.display = 'block';
    }
  });
}

function _showProfileToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:10001;background:#22c55e;color:#000;padding:10px 24px;border-radius:24px;font-size:14px;font-weight:700;box-shadow:0 4px 16px rgba(34,197,94,0.4);animation:fadeInOut 2.5s ease;';
  t.textContent = msg;
  const s = document.createElement('style');
  s.textContent = '@keyframes fadeInOut{0%{opacity:0;transform:translateX(-50%) translateY(-8px)}10%{opacity:1;transform:translateX(-50%)}80%{opacity:1}100%{opacity:0;transform:translateX(-50%) translateY(-8px)}}';
  t.appendChild(s);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

function _renderItemCard(emoji, name, count, desc) {
  return `
    <div class="flex-1 card-elevated rounded-2xl p-4 border-2 ${count > 0 ? 'border-primary-container/30' : 'border-outline-variant/15'}">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-full ${count > 0 ? 'bg-primary-container/30' : 'bg-surface-container'} flex items-center justify-center text-2xl">${emoji}</div>
        <div class="flex-1">
          <div class="text-sm font-bold text-on-surface">${name}</div>
          <div class="text-[10px] text-on-surface-variant mt-0.5">${desc}</div>
        </div>
      </div>
      <div class="mt-3 text-center">
        <span class="text-2xl font-headline font-extrabold ${count > 0 ? 'text-primary' : 'text-on-surface-variant/40'}">${count}</span>
        <span class="text-xs text-on-surface-variant ml-1">张</span>
      </div>
    </div>
  `;
}

function _renderBadge(name, icon, colorClass, unlocked) {
  return `
    <div class="flex flex-col items-center gap-1.5 min-w-[64px]">
      <div class="w-14 h-14 rounded-full ${colorClass} flex items-center justify-center ${unlocked ? '' : 'opacity-40'}">
        <span class="material-symbols-outlined ${unlocked ? 'filled' : ''}" style="${unlocked ? "font-variation-settings: 'FILL' 1;" : ''}">${icon}</span>
      </div>
      <span class="text-[10px] text-on-surface-variant font-bold whitespace-nowrap">${name}</span>
    </div>
  `;
}

function _renderRecordItem(record) {
  const isWin = record.isWinner;
  const profit = record.profit || 0;
  const profitText = profit >= 0 ? `+${profit.toLocaleString()}` : profit.toLocaleString();
  const profitColor = profit > 0 ? 'text-secondary' : profit < 0 ? 'text-error' : 'text-on-surface-variant';
  const roomName = ROOM_TYPE_MAP[record.roomType] || record.roomType || '未知';
  const handType = record.handType || '-';

  // 格式化时间（只取日期和时间部分）
  let timeStr = '';
  if (record.playedAt) {
    const d = record.playedAt.replace('T', ' ').substring(0, 16);
    timeStr = d;
  }

  return `
    <div class="flex items-center gap-3 px-4 py-3">
      <div class="w-10 h-10 rounded-full ${isWin ? 'bg-secondary/10' : 'bg-error/10'} flex items-center justify-center">
        <span class="material-symbols-outlined ${isWin ? 'text-secondary' : 'text-error'}" style="font-size: 20px;">
          ${isWin ? 'emoji_events' : 'trending_down'}
        </span>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-sm font-bold text-on-surface">${roomName}</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">${handType}</span>
        </div>
        <p class="text-[10px] text-on-surface-variant/60 mt-0.5">${timeStr}</p>
      </div>
      <div class="text-right">
        <p class="text-sm font-bold ${profitColor}">${profitText}</p>
        <p class="text-[10px] text-on-surface-variant/60">下注 ${(record.betAmount || 0).toLocaleString()}</p>
      </div>
    </div>
  `;
}
