/**
 * 应用入口
 * 初始化路由、WebSocket、渲染底部导航
 */
import './styles/fonts.css';
import { router } from './router.js';
import { wsClient } from './ws.js';
import { store } from './store.js';
import { renderNavbar, updateNavbar } from './components/navbar.js';
import { renderLobby } from './pages/lobby.js';
import { renderTable } from './pages/table.js';
import { renderResult } from './pages/result.js';
import { renderShop } from './pages/shop.js';
import { renderLeaderboard } from './pages/leaderboard.js';
import { renderProfile } from './pages/profile.js';
import { renderAuth } from './pages/auth.js';

// 不显示底部导航的页面
const FULL_SCREEN_PAGES = ['/table', '/result', '/auth'];

async function init() {
    const app = document.getElementById('app');
    if (!app) return;

    // 创建页面容器
    const pageContainer = document.createElement('div');
    pageContainer.id = 'page-container';
    app.appendChild(pageContainer);

    // 创建底部导航
    const navbar = renderNavbar();
    app.appendChild(navbar);

    // 注册路由
    router
        .register('/', renderLobby)
        .register('/shop', renderShop)
        .register('/leaderboard', renderLeaderboard)
        .register('/profile', renderProfile)
        .register('/table', renderTable)
        .register('/result', renderResult)
        .register('/auth', renderAuth);

    // 监听路由变化，控制导航栏显隐
    window.addEventListener('hashchange', () => {
        const path = router.getCurrentPath();
        const isFullScreen = FULL_SCREEN_PAGES.includes(path);

        navbar.style.display = isFullScreen ? 'none' : 'block';
        updateNavbar(path);
    });

    // 检查登录态并尝试恢复会话
    const token = localStorage.getItem('token');
    const playerSnapshot = localStorage.getItem('playerSnapshot');
    
    if (token) {
        // 1. 优先显示缓存数据（提升稳定性与流畅度）
        if (playerSnapshot) {
            try {
                const data = JSON.parse(playerSnapshot);
                store.update('player', data);
            } catch (e) {
                console.error('解析缓存快照失败', e);
            }
        }
        store.set('isLoggedIn', true);
        wsClient.connect();

        // 2. 立即初始化路由（进入大厅）
        router.init(pageContainer);

        // 3. 后台异步校验 token 有效性并同步最新数据
        try {
            const res = await fetch('/api/auth/me', {
                headers: { 'Authorization': token }
            });
            const json = await res.json();

            if (json.code === 0) {
                // token 有效，更新数据快照
                const data = json.data;
                const freshData = {
                    id: data.playerId,
                    name: data.name,
                    chips: data.chips,
                    diamonds: data.diamonds,
                    avatar: data.avatar || '',
                    totalGames: data.totalGames || 0,
                    winGames: data.winGames || 0,
                    maxWin: data.maxWin || 0
                };
                store.update('player', freshData);
                localStorage.setItem('playerSnapshot', JSON.stringify(freshData));
            } else {
                // token 已失效，清理并跳转
                handleAuthFailure(pageContainer);
            }
        } catch (e) {
            console.warn('后台校验失败（网络问题），将继续使用缓存', e);
            // 如果是因为网络问题失败，暂时保留缓存状态，不强制退出
        }
    } else {
        // 未登录，跳转登录页
        router.init(pageContainer);
        router.navigate('/auth');
    }

    // 初始导航栏状态
    const initialPath = router.getCurrentPath();
    navbar.style.display = FULL_SCREEN_PAGES.includes(initialPath) ? 'none' : 'block';

    console.log('🃏 欢乐三张已启动!');
}

/**
 * 处理认证失败：清理缓存并跳转登录页
 */
function handleAuthFailure(pageContainer) {
    localStorage.removeItem('token');
    localStorage.removeItem('playerId');
    localStorage.removeItem('playerSnapshot');
    store.reset();
    
    // 如果还没初始化过，先初始化
    if (!router.container) {
        router.init(pageContainer);
    }
    router.navigate('/auth');
    store.set('ui.toast', { message: '登录已过期，请重新登录', type: 'error' });
}

// DOM 就绪后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
