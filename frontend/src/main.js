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

    // 检查登录态
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const res = await fetch('/api/auth/me', {
                headers: { 'Authorization': token }
            });
            const json = await res.json();

            if (json.code === 0) {
                // token 有效，恢复玩家数据
                const data = json.data;
                store.update('player', {
                    id: data.playerId,
                    name: data.name,
                    chips: data.chips,
                    diamonds: data.diamonds,
                    avatar: data.avatar || '',
                    totalGames: data.totalGames || 0,
                    winGames: data.winGames || 0,
                    maxWin: data.maxWin || 0
                });
                store.set('isLoggedIn', true);

                // 连接 WebSocket
                wsClient.connect();

                // 初始化路由（进入大厅）
                router.init(pageContainer);
            } else {
                // token 过期，清除并跳转登录
                localStorage.removeItem('token');
                localStorage.removeItem('playerId');
                router.init(pageContainer);
                router.navigate('/auth');
            }
        } catch (e) {
            // 网络错误（后端未启动），跳转登录页
            router.init(pageContainer);
            router.navigate('/auth');
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

// DOM 就绪后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
