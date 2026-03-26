/**
 * 简易 Hash 路由器
 * 管理 SPA 页面切换
 */
export class Router {
    constructor() {
        this.routes = new Map();
        this.currentPage = null;
        this.container = null;

        window.addEventListener('hashchange', () => this._onHashChange());
    }

    /**
     * 初始化路由
     * @param {HTMLElement} container 页面容器
     */
    init(container) {
        this.container = container;
        this._onHashChange();
    }

    /**
     * 注册路由
     * @param {string} path 路径
     * @param {Function} renderFn 渲染函数，接收 container 参数
     */
    register(path, renderFn) {
        this.routes.set(path, renderFn);
        return this;
    }

    /**
     * 导航到指定路径
     */
    navigate(path) {
        window.location.hash = path;
    }

    /**
     * 获取当前路径
     */
    getCurrentPath() {
        return window.location.hash.slice(1) || '/';
    }

    /**
     * 处理路由变化
     */
    _onHashChange() {
        const path = this.getCurrentPath();
        const renderFn = this.routes.get(path);

        if (renderFn && this.container) {
            // 清除当前页面
            this.container.innerHTML = '';

            // 渲染新页面
            const page = renderFn();
            if (typeof page === 'string') {
                this.container.innerHTML = page;
            } else if (page instanceof HTMLElement) {
                this.container.appendChild(page);
            }

            this.currentPage = path;

            // 添加进入动画
            this.container.firstElementChild?.classList.add('page-enter');
        } else if (this.routes.size > 0) {
            // 默认跳转到首页
            this.navigate('/');
        }
    }
}

// 全局路由实例
export const router = new Router();
