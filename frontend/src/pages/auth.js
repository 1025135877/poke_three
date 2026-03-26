/**
 * 登录/注册页面
 */
import { store } from '../store.js';
import { router } from '../router.js';
import { wsClient } from '../ws.js';
import { getAvatarUrl } from '../utils/avatarUtil.js';

// 预设头像种子列表
const AVATAR_SEEDS = [
  'Felix', 'Aneka', 'Luna', 'Max', 'Zoe', 'Leo',
  'Mia', 'Oscar', 'Nala', 'Rex', 'Ivy', 'Coco'
];

export function renderAuth() {
  const container = document.createElement('div');
  container.className = 'min-h-screen bg-surface flex flex-col';

  // 是否为注册模式
  let isRegister = false;
  // 错误提示
  let errorMsg = '';
  // 加载中
  let loading = false;
  // 选中的头像种子
  let selectedAvatar = AVATAR_SEEDS[0];

  function render() {
    const previewSeed = isRegister ? selectedAvatar : '欢迎回来';
    container.innerHTML = `
    <div class="flex-1 flex flex-col items-center justify-center px-6 pb-8">
      <!-- Logo 区域 -->
      <div class="mb-6 text-center">
        <div class="text-5xl mb-2">🃏</div>
        <h1 class="text-3xl font-headline font-extrabold text-on-surface">欢乐三张</h1>
        <p class="text-sm text-on-surface-variant mt-1">最刺激的炸金花体验</p>
      </div>

      <!-- 头像预览 -->
      <div class="w-20 h-20 rounded-full border-4 border-primary-container overflow-hidden bg-surface-container shadow-lg mb-4">
        <img id="avatar-preview" src="${getAvatarUrl(previewSeed)}" alt="avatar" class="w-full h-full object-cover" />
      </div>

      <!-- 表单卡片 -->
      <div class="w-full max-w-sm">
        <div class="card-elevated rounded-3xl p-6 space-y-4">
          <h2 class="text-xl font-headline font-bold text-center text-on-surface">
            ${isRegister ? '创建账号' : '登录'}
          </h2>

          <!-- 错误提示 -->
          ${errorMsg ? `
          <div class="bg-error-container text-on-error-container text-sm px-4 py-2 rounded-xl flex items-center gap-2">
            <span class="material-symbols-outlined" style="font-size: 18px;">error</span>
            <span>${errorMsg}</span>
          </div>` : ''}

          ${isRegister ? `
          <!-- 头像选择 -->
          <div>
            <label class="block text-xs font-semibold text-on-surface-variant mb-1.5 ml-1">选择头像</label>
            <div class="grid grid-cols-6 gap-2" id="avatar-grid">
              ${AVATAR_SEEDS.map(seed => `
                <button type="button" data-seed="${seed}"
                  class="w-full aspect-square rounded-xl overflow-hidden border-3 transition-all duration-200
                    ${seed === selectedAvatar ? 'border-primary shadow-md scale-105' : 'border-transparent opacity-60 hover:opacity-90'}"
                >
                  <img src="${getAvatarUrl(seed)}" alt="${seed}" class="w-full h-full object-cover" />
                </button>
              `).join('')}
            </div>
          </div>` : ''}

          <!-- 昵称输入 -->
          <div>
            <label class="block text-xs font-semibold text-on-surface-variant mb-1.5 ml-1">昵称</label>
            <div class="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-container border-2 border-transparent focus-within:border-primary transition-colors">
              <span class="material-symbols-outlined text-on-surface-variant" style="font-size: 20px;">person</span>
              <input id="auth-name" type="text" placeholder="输入你的昵称"
                class="flex-1 bg-transparent outline-none text-sm text-on-surface placeholder:text-on-surface-variant/50"
                maxlength="20" autocomplete="username" />
            </div>
          </div>

          <!-- 密码输入 -->
          <div>
            <label class="block text-xs font-semibold text-on-surface-variant mb-1.5 ml-1">密码</label>
            <div class="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-container border-2 border-transparent focus-within:border-primary transition-colors">
              <span class="material-symbols-outlined text-on-surface-variant" style="font-size: 20px;">lock</span>
              <input id="auth-password" type="password" placeholder="${isRegister ? '设置密码（至少6位）' : '输入密码'}"
                class="flex-1 bg-transparent outline-none text-sm text-on-surface placeholder:text-on-surface-variant/50"
                autocomplete="${isRegister ? 'new-password' : 'current-password'}" />
            </div>
          </div>

          ${isRegister ? `
          <!-- 确认密码 -->
          <div>
            <label class="block text-xs font-semibold text-on-surface-variant mb-1.5 ml-1">确认密码</label>
            <div class="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-container border-2 border-transparent focus-within:border-primary transition-colors">
              <span class="material-symbols-outlined text-on-surface-variant" style="font-size: 20px;">lock</span>
              <input id="auth-confirm" type="password" placeholder="再次输入密码"
                class="flex-1 bg-transparent outline-none text-sm text-on-surface placeholder:text-on-surface-variant/50"
                autocomplete="new-password" />
            </div>
          </div>` : ''}

          <!-- 提交按钮 -->
          <button id="auth-submit"
            class="w-full py-3.5 rounded-xl bg-primary text-on-primary font-bold text-base shadow-md
                   hover:shadow-lg active:scale-[0.98] transition-all duration-200
                   disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            ${loading ? 'disabled' : ''}>
            ${loading ? `
              <span class="inline-block w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
              <span>处理中...</span>
            ` : `
              <span class="material-symbols-outlined" style="font-size: 20px;">${isRegister ? 'person_add' : 'login'}</span>
              <span>${isRegister ? '注册' : '登录'}</span>
            `}
          </button>
        </div>

        <!-- 切换模式 -->
        <div class="text-center mt-4">
          <span class="text-sm text-on-surface-variant">
            ${isRegister ? '已有账号？' : '还没有账号？'}
          </span>
          <button id="auth-toggle" class="text-sm font-bold text-primary hover:underline ml-1">
            ${isRegister ? '立即登录' : '注册一个'}
          </button>
        </div>
      </div>
    </div>
    `;

    // 绑定事件
    bindEvents();
  }

  function bindEvents() {
    // 头像选择网格事件
    container.querySelectorAll('#avatar-grid button').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedAvatar = btn.dataset.seed;
        render();
      });
    });

    const nameInput = container.querySelector('#auth-name');

    // 切换登录/注册
    container.querySelector('#auth-toggle')?.addEventListener('click', () => {
      isRegister = !isRegister;
      errorMsg = '';
      render();
    });

    // 提交表单
    container.querySelector('#auth-submit')?.addEventListener('click', handleSubmit);

    // 回车提交
    container.querySelectorAll('input').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSubmit();
      });
    });

    // 自动聚焦
    nameInput?.focus();
  }

  async function handleSubmit() {
    const name = container.querySelector('#auth-name')?.value.trim();
    const password = container.querySelector('#auth-password')?.value;

    // 前端校验
    if (!name) { errorMsg = '请输入昵称'; render(); return; }
    if (!password || password.length < 6) { errorMsg = '密码不能少于6位'; render(); return; }

    if (isRegister) {
      const confirm = container.querySelector('#auth-confirm')?.value;
      if (password !== confirm) { errorMsg = '两次密码不一致'; render(); return; }
    }

    loading = true;
    errorMsg = '';
    render();

    try {
      const url = isRegister ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password, avatar: isRegister ? selectedAvatar : undefined })
      });
      const json = await res.json();

      if (json.code !== 0) {
        errorMsg = json.message || '操作失败';
        loading = false;
        render();
        return;
      }

      // 登录成功
      const data = json.data;
      localStorage.setItem('token', data.token);
      localStorage.setItem('playerId', data.playerId);

      // 更新 Store
      store.update('player', {
        id: data.playerId,
        name: data.name,
        chips: data.chips,
        diamonds: data.diamonds,
        avatar: data.avatar
      });
      store.set('isLoggedIn', true);

      // 连接 WebSocket
      wsClient.connect();

      // 跳转到大厅
      router.navigate('/');

    } catch (e) {
      errorMsg = '网络错误，请稍后重试';
      loading = false;
      render();
    }
  }

  render();
  return container;
}
