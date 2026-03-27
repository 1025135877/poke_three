/**
 * 大厅页面 — 基于 ui/lobby_1 设计
 * 包含 Hero Banner、签到入口、房间选择、人机对战、今日任务
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
          <h1 class="text-xl font-headline font-extrabold text-on-surface">${player.name || '欢乐三张'}</h1>
          <div class="flex items-center gap-1 text-sm text-primary font-bold">
            <span class="material-symbols-outlined text-sm filled" style="font-variation-settings: 'FILL' 1;">monetization_on</span>
            <span id="lobby-chips">${player.chips.toLocaleString()}</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button id="btn-checkin" class="flex items-center gap-1 px-4 py-2 rounded-full bg-secondary text-on-secondary font-bold text-sm shadow-md hover:shadow-lg active:scale-95 transition-all duration-200">
          <span class="material-symbols-outlined text-sm filled" style="font-variation-settings: 'FILL' 1;">event_available</span>
          <span id="checkin-label">签到</span>
        </button>
        <button class="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors active:scale-90 duration-200">
          <span class="material-symbols-outlined text-on-surface-variant">settings</span>
        </button>
      </div>
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

      <!-- 人机对战入口 -->
      <section class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-tertiary-container to-tertiary p-5 text-on-tertiary cursor-pointer hover:shadow-xl active:scale-[0.98] transition-all duration-200" id="btn-ai-match">
        <div class="flex items-center justify-between">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="tag bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">🤖 人机对战</span>
              <span class="text-xs opacity-80">5个AI对手</span>
            </div>
            <h3 class="text-xl font-headline font-extrabold">挑战AI赌神</h3>
            <p class="text-sm opacity-80 mt-1">与5种性格AI切磋牌技</p>
          </div>
          <div class="text-6xl opacity-60">🎰</div>
        </div>
        <div class="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full"></div>
      </section>

      <!-- 今日任务 -->
      <section id="daily-tasks-section">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-headline font-extrabold text-on-surface">今日任务</h3>
          <span class="text-sm text-on-surface-variant" id="task-progress">加载中...</span>
        </div>
        <div class="space-y-3" id="task-list">
          <!-- 动态加载 -->
          <div class="card-elevated rounded-2xl p-4 animate-pulse">
            <div class="h-4 bg-surface-container rounded w-32"></div>
          </div>
        </div>
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

    // 人机对战
    page.querySelector('#btn-ai-match')?.addEventListener('click', () => {
      _aiMatch('beginner', page);
    });

    // 签到
    page.querySelector('#btn-checkin')?.addEventListener('click', () => {
      _showCheckinDialog(page);
    });

    // 加载签到状态
    _loadCheckinStatus(page);

    // 加载今日任务
    _loadDailyTasks(page);
  }, 0);

  return page;
}

// ===== 签到状态加载 =====

async function _loadCheckinStatus(page) {
  const token = localStorage.getItem('token');
  if (!token) return;
  try {
    const res = await fetch('/api/auth/checkin/status', { headers: { 'Authorization': token } });
    const json = await res.json();
    if (json.code === 0 && json.data.checkedInToday) {
      const btn = page.querySelector('#btn-checkin');
      const label = page.querySelector('#checkin-label');
      if (btn) {
        btn.classList.remove('bg-secondary', 'text-on-secondary', 'shadow-md', 'hover:shadow-lg');
        btn.classList.add('bg-surface-container', 'text-on-surface-variant');
      }
      if (label) label.textContent = '已签到';
    }
  } catch (e) {
    // 静默失败
  }
}

// ===== 签到弹窗 =====

async function _showCheckinDialog(page) {
  const token = localStorage.getItem('token');
  if (!token) return;

  // 加载签到状态
  let statusData = null;
  try {
    const res = await fetch('/api/auth/checkin/status', { headers: { 'Authorization': token } });
    const json = await res.json();
    if (json.code === 0) statusData = json.data;
  } catch (e) {
    console.error('加载签到状态失败', e);
  }

  if (!statusData) {
    _showToast('加载签到信息失败');
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'checkin-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';

  const { checkedInToday, dayCount, rewardList } = statusData;

  overlay.innerHTML = `
    <div style="background:var(--md-sys-color-surface, #1a1a2e);border-radius:24px;padding:24px;width:90%;max-width:380px;box-shadow:0 24px 48px rgba(0,0,0,0.4);position:relative;">
      <button id="checkin-close" style="position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.1);border:none;color:rgba(255,255,255,0.6);font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>

      <div style="text-align:center;margin-bottom:16px;">
        <span class="material-symbols-outlined" style="font-size:40px;color:var(--md-sys-color-secondary, #f59e0b);font-variation-settings: 'FILL' 1;">event_available</span>
        <h2 style="font-size:22px;font-weight:800;color:var(--md-sys-color-on-surface, #fff);margin:8px 0 4px;">每日签到</h2>
        <p style="font-size:13px;color:rgba(255,255,255,0.5);">已连续签到 <strong style="color:var(--md-sys-color-secondary, #f59e0b);">${dayCount}</strong> 天</p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:20px;">
        ${rewardList.map(item => {
    const isClaimed = item.claimed;
    const isCurrent = item.current;
    const isToday = isCurrent && !checkedInToday;
    let bgColor = isClaimed ? 'rgba(16,185,129,0.2)' : (isToday ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)');
    let borderColor = isClaimed ? 'rgba(16,185,129,0.5)' : (isToday ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.1)');
    let textColor = isClaimed ? '#10b981' : (isToday ? '#f59e0b' : 'rgba(255,255,255,0.4)');

    return `<div style="background:${bgColor};border:2px solid ${borderColor};border-radius:12px;padding:6px 2px;text-align:center;">
            <div style="font-size:10px;color:${textColor};font-weight:700;">第${item.day}天</div>
            <div style="font-size:11px;color:${textColor};font-weight:800;margin-top:2px;">${(item.reward / 1000).toFixed(0)}K</div>
            ${isClaimed ? '<div style="font-size:10px;color:#10b981;">✓</div>' : ''}
          </div>`;
  }).join('')}
      </div>

      <button id="checkin-btn" style="width:100%;padding:14px;border-radius:16px;font-size:16px;font-weight:800;border:none;cursor:pointer;transition:all 0.2s;${checkedInToday
      ? 'background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.4);cursor:not-allowed;'
      : 'background:linear-gradient(135deg,#f59e0b,#ef4444);color:white;box-shadow:0 4px 16px rgba(245,158,11,0.3);'
    }" ${checkedInToday ? 'disabled' : ''}>
        ${checkedInToday ? '✅ 今日已签到' : `🎁 立即签到 +${statusData.nextReward.toLocaleString()} 金币`}
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#checkin-close')?.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  if (!checkedInToday) {
    overlay.querySelector('#checkin-btn')?.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/auth/checkin', {
          method: 'POST',
          headers: { 'Authorization': token }
        });
        const json = await res.json();
        if (json.code === 0) {
          store.update('player', { chips: json.data.totalChips });
          const chipsEl = page.querySelector('#lobby-chips');
          if (chipsEl) chipsEl.textContent = json.data.totalChips.toLocaleString();
          _showToast(`签到成功！连续${json.data.dayCount}天，+${json.data.rewardChips.toLocaleString()} 金币 🎉`);
          overlay.remove();
          // 刷新任务列表
          _loadDailyTasks(page);
        } else {
          _showToast(json.message || '签到失败');
        }
      } catch (e) {
        _showToast('网络错误');
      }
    });
  }
}

// ===== 每日任务加载 =====

async function _loadDailyTasks(page) {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const res = await fetch('/api/auth/tasks', { headers: { 'Authorization': token } });
    const json = await res.json();
    if (json.code !== 0 || !json.data) return;

    const tasks = json.data;
    const completed = tasks.filter(t => t.isCompleted).length;
    const total = tasks.length;

    const progressEl = page.querySelector('#task-progress');
    if (progressEl) progressEl.textContent = `${completed}/${total}`;

    const listEl = page.querySelector('#task-list');
    if (!listEl) return;

    listEl.innerHTML = tasks.map(task => {
      const isCompleted = task.isCompleted;
      const isClaimed = task.isClaimed;

      let statusHtml;
      if (isClaimed) {
        statusHtml = `<span class="text-xs text-on-surface-variant px-3 py-1.5 rounded-full bg-surface-container">已领取</span>`;
      } else if (isCompleted) {
        statusHtml = `<button class="claim-task-btn text-xs font-bold text-on-secondary px-4 py-1.5 rounded-full bg-secondary shadow-sm hover:shadow-md active:scale-95 transition-all" data-type="${task.type}">领取 +${task.reward.toLocaleString()}</button>`;
      } else {
        statusHtml = `<span class="text-xs text-on-surface-variant/60 px-3 py-1.5 rounded-full bg-surface-container/50">未完成</span>`;
      }

      return `
        <div class="card-elevated rounded-2xl px-4 py-3 flex items-center gap-3 border-2 ${isCompleted && !isClaimed ? 'border-secondary/30' : 'border-transparent'}">
          <div class="w-10 h-10 rounded-full ${isCompleted ? 'bg-secondary/10' : 'bg-surface-container'} flex items-center justify-center">
            <span class="material-symbols-outlined ${isCompleted ? 'text-secondary' : 'text-on-surface-variant/40'}" style="font-size:20px;${isCompleted ? "font-variation-settings: 'FILL' 1;" : ''}">${task.icon}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold text-on-surface">${task.name}</p>
            <p class="text-[11px] text-on-surface-variant/60">${task.desc}</p>
          </div>
          ${statusHtml}
        </div>
      `;
    }).join('');

    // 绑定领取按钮事件
    listEl.querySelectorAll('.claim-task-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const taskType = btn.dataset.type;
        try {
          const res = await fetch('/api/auth/tasks/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify({ taskType })
          });
          const json = await res.json();
          if (json.code === 0) {
            store.update('player', { chips: json.data.totalChips });
            const chipsEl = page.querySelector('#lobby-chips');
            if (chipsEl) chipsEl.textContent = json.data.totalChips.toLocaleString();
            _showToast(`奖励已领取！+${json.data.reward.toLocaleString()} 金币`);
            _loadDailyTasks(page); // 刷新
          } else {
            _showToast(json.message || '领取失败');
          }
        } catch (e) {
          _showToast('网络错误');
        }
      });
    });
  } catch (e) {
    console.error('加载任务失败', e);
  }
}

// ===== 匹配与遮罩 =====

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

function _aiMatch(roomType, page) {
  _showMatchingOverlay(page);

  const offFail = wsClient.on('match_failed', (data) => {
    _hideMatchingOverlay();
    _showToast(data.message || '匹配失败');
    offFail();
  });

  const offJoin = wsClient.on('room_joined', (data) => {
    _hideMatchingOverlay();
    _showToast('已进入人机对战房间 🤖');
    offJoin();
    offFail();
  });

  wsClient.send('ai_match', { roomType });
}
