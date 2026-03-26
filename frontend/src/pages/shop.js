/**
 * 商店页面 — 基于 ui/diamond_shop_1 设计
 */
import { store } from '../store.js';
import { getAvatarUrl } from '../utils/avatarUtil.js';

export function renderShop() {
  const player = store.state.player;

  const page = document.createElement('div');
  page.className = 'page';
  page.id = 'shop-page';

  page.innerHTML = `
    <!-- 顶部栏 -->
    <header class="top-bar">
      <div class="flex items-center gap-2">
        <div class="w-10 h-10 rounded-full border-3 border-primary-container overflow-hidden bg-surface-container">
          <img src="${getAvatarUrl(player.avatar || player.name)}" alt="" class="w-full h-full object-cover" />
        </div>
        <span class="text-lg font-headline font-bold">欢乐三张</span>
      </div>
      <button class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center">
        <span class="material-symbols-outlined text-on-surface-variant text-sm">settings</span>
      </button>
    </header>

    <main class="px-5 space-y-5 pb-28">
      <!-- 余额展示 -->
      <section class="flex gap-3">
        <div class="flex-1 card-elevated flex flex-col items-center py-4 rounded-2xl border-2 border-primary-container/30">
          <div class="w-10 h-10 bg-primary-container rounded-full flex items-center justify-center mb-2">
            <span class="material-symbols-outlined text-primary filled" style="font-variation-settings: 'FILL' 1;">monetization_on</span>
          </div>
          <span class="text-xl font-headline font-extrabold text-on-surface">${player.chips.toLocaleString()}</span>
          <span class="text-xs text-on-surface-variant">我的金币</span>
        </div>
        <div class="flex-1 card-elevated flex flex-col items-center py-4 rounded-2xl border-2 border-outline-variant/20">
          <div class="w-10 h-10 bg-secondary-container rounded-full flex items-center justify-center mb-2">
            <span class="material-symbols-outlined text-secondary filled" style="font-variation-settings: 'FILL' 1;">diamond</span>
          </div>
          <span class="text-xl font-headline font-extrabold text-on-surface">${player.diamonds}</span>
          <span class="text-xs text-on-surface-variant">我的钻石</span>
        </div>
      </section>

      <!-- Tab 切换 -->
      <section class="flex gap-2">
        <button class="tag tag-yellow font-bold text-sm px-5 py-2 shop-tab active" data-tab="coins">金币</button>
        <button class="tag bg-surface-container text-on-surface-variant font-bold text-sm px-5 py-2 shop-tab" data-tab="diamonds">钻石</button>
        <button class="tag bg-surface-container text-on-surface-variant font-bold text-sm px-5 py-2 shop-tab" data-tab="props">道具</button>
      </section>

      <!-- 新手大礼包 -->
      <section class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-tertiary to-tertiary-dim p-5 text-on-tertiary">
        <div class="tag tag-red mb-2 inline-block text-xs">限时特惠</div>
        <h3 class="text-xl font-headline font-extrabold">新手大礼包</h3>
        <p class="text-sm opacity-80 mt-1">内含 5,000,000 金币 +<br/>限定头像框</p>
        <button class="mt-3 bg-white/20 hover:bg-white/30 text-white font-bold px-5 py-2 rounded-full text-sm transition-colors backdrop-blur-sm">
          立即抢购 ¥6.00
        </button>
        <div class="absolute right-4 top-1/2 -translate-y-1/2 text-6xl opacity-30">🎁</div>
      </section>

      <!-- 商品网格 -->
      <section class="grid grid-cols-2 gap-4" id="shop-items">
        ${_renderShopItem('一袋金币', '100,000 金币', '¥2.00', '💰')}
        ${_renderShopItem('一罐金币', '500,000 金币', '¥10.00', '🏺')}
        ${_renderShopItem('一箱金币', '1,500,000 金币', '¥28.00', '📦', '超值')}
        ${_renderShopItem('碎钻包', '60 钻石', '¥6.00', '💎')}
        ${_renderShopItem('超级大金库', '10,000,000 金币', '¥168.00', '🏦')}
        ${_renderShopItem('换牌卡', '道具商城中', '查看道具', '🃏', null, true)}
      </section>
    </main>
  `;

  // Tab 切换
  setTimeout(() => {
    page.querySelectorAll('.shop-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        page.querySelectorAll('.shop-tab').forEach(t => {
          t.classList.remove('active', 'tag-yellow');
          t.classList.add('bg-surface-container', 'text-on-surface-variant');
        });
        tab.classList.add('active', 'tag-yellow');
        tab.classList.remove('bg-surface-container', 'text-on-surface-variant');
      });
    });
  }, 0);

  return page;
}

function _renderShopItem(name, desc, price, emoji, tag = null, isDashed = false) {
  return `
    <div class="card-elevated flex flex-col items-center py-5 px-4 rounded-2xl cursor-pointer hover:scale-[1.02] transition-transform active:scale-95 relative ${isDashed ? 'border-2 border-dashed border-outline-variant/30' : 'border-2 border-outline-variant/15'}">
      ${tag ? `<div class="absolute -top-1 -right-1 tag tag-red text-[10px]">${tag}</div>` : ''}
      <div class="text-4xl mb-3">${emoji}</div>
      <h4 class="text-sm font-headline font-extrabold text-on-surface text-center">${name}</h4>
      <p class="text-[11px] text-on-surface-variant mt-0.5">${desc}</p>
      <button class="mt-3 ${isDashed ? 'bg-surface-container text-on-surface-variant' : 'bg-secondary/10 text-secondary'} font-bold text-sm px-5 py-1.5 rounded-full">
        ${price}
      </button>
    </div>
  `;
}
