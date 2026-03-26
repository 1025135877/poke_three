/**
 * 底部导航栏组件
 */
import { router } from '../router.js';

const NAV_ITEMS = [
    { path: '/', icon: 'home', label: '大厅' },
    { path: '/shop', icon: 'storefront', label: '商店' },
    { path: '/leaderboard', icon: 'leaderboard', label: '排行' },
    { path: '/profile', icon: 'person', label: '我的' }
];

export function renderNavbar() {
    const currentPath = router.getCurrentPath();

    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.id = 'bottom-nav';

    nav.innerHTML = `
    <div class="flex items-center justify-around py-1">
      ${NAV_ITEMS.map(item => {
        const isActive = currentPath === item.path;
        return `
          <div class="bottom-nav-item ${isActive ? 'active' : ''}" data-path="${item.path}">
            <div class="nav-icon-wrapper">
              <span class="material-symbols-outlined ${isActive ? 'filled' : ''}" style="${isActive ? "font-variation-settings: 'FILL' 1;" : ''}">${item.icon}</span>
            </div>
            <span class="text-xs font-medium">${item.label}</span>
          </div>
        `;
    }).join('')}
    </div>
  `;

    // 绑定点击事件
    nav.querySelectorAll('.bottom-nav-item').forEach(el => {
        el.addEventListener('click', () => {
            const path = el.dataset.path;
            router.navigate(path);
            // 更新激活状态
            updateNavbar(path);
        });
    });

    return nav;
}

export function updateNavbar(activePath) {
    const nav = document.getElementById('bottom-nav');
    if (!nav) return;

    nav.querySelectorAll('.bottom-nav-item').forEach(el => {
        const path = el.dataset.path;
        const isActive = path === activePath;
        el.classList.toggle('active', isActive);

        const icon = el.querySelector('.material-symbols-outlined');
        if (icon) {
            icon.classList.toggle('filled', isActive);
            icon.style.fontVariationSettings = isActive ? "'FILL' 1" : "'FILL' 0";
        }
    });
}
