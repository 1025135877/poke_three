/**
 * 商店页面 — 金币/钻石/道具购买
 * 支持模拟购买（预留支付宝/微信接口）
 */
import { store } from '../store.js';
import { getAvatarUrl } from '../utils/avatarUtil.js';

// 商品定义
const SHOP_ITEMS = {
  coins: [
    { id: 'coins_100k', name: '一袋金币', desc: '100,000 金币', price: '¥2.00', emoji: '💰', priceType: 'cash' },
    { id: 'coins_500k', name: '一罐金币', desc: '500,000 金币', price: '¥10.00', emoji: '🏺', priceType: 'cash' },
    { id: 'coins_1500k', name: '一箱金币', desc: '1,500,000 金币', price: '¥28.00', emoji: '📦', tag: '超值', priceType: 'cash' },
    { id: 'coins_10m', name: '超级大金库', desc: '10,000,000 金币', price: '¥168.00', emoji: '🏦', priceType: 'cash' },
  ],
  diamonds: [
    { id: 'diamonds_60', name: '碎钻包', desc: '60 钻石', price: '¥6.00', emoji: '💎', priceType: 'cash' },
    { id: 'd2c_50k', name: '钻石兑金币', desc: '50钻石→50,000金币', price: '50💎', emoji: '🔄', priceType: 'diamonds' },
    { id: 'd2c_200k', name: '钻石兑金币', desc: '150钻石→200,000金币', price: '150💎', emoji: '🔄', tag: '划算', priceType: 'diamonds' },
  ],
  props: [
    { id: 'xray_card_3', name: '透视卡×3', desc: '随机窥探对手一张牌', price: '30💎', emoji: '🔍', priceType: 'diamonds' },
    { id: 'swap_card_3', name: '换牌卡×3', desc: '盲换手中一张牌', price: '50💎', emoji: '🔄', priceType: 'diamonds' },
  ]
};

export function renderShop() {
  const player = store.state.player;
  let activeTab = 'coins';

  const page = document.createElement('div');
  page.className = 'page';
  page.id = 'shop-page';

  function render() {
    // 重新获取最新数据
    const p = store.state.player;

    page.innerHTML = `
      <!-- 顶部栏 -->
      <header class="top-bar">
        <div class="flex items-center gap-2">
          <div class="w-10 h-10 rounded-full border-3 border-primary-container overflow-hidden bg-surface-container">
            <img src="${getAvatarUrl(p.avatar || p.name)}" alt="" class="w-full h-full object-cover" />
          </div>
          <span class="text-lg font-headline font-bold">${p.name || '欢乐三张'}</span>
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
            <span class="text-xl font-headline font-extrabold text-on-surface" id="shop-chips">${p.chips.toLocaleString()}</span>
            <span class="text-xs text-on-surface-variant">我的金币</span>
          </div>
          <div class="flex-1 card-elevated flex flex-col items-center py-4 rounded-2xl border-2 border-outline-variant/20">
            <div class="w-10 h-10 bg-secondary-container rounded-full flex items-center justify-center mb-2">
              <span class="material-symbols-outlined text-secondary filled" style="font-variation-settings: 'FILL' 1;">diamond</span>
            </div>
            <span class="text-xl font-headline font-extrabold text-on-surface" id="shop-diamonds">${p.diamonds}</span>
            <span class="text-xs text-on-surface-variant">我的钻石</span>
          </div>
        </section>

        <!-- Tab 切换 -->
        <section class="flex gap-2">
          <button class="font-bold text-sm px-5 py-2 rounded-full shop-tab ${activeTab === 'coins' ? 'tag tag-yellow' : 'bg-surface-container text-on-surface-variant'}" data-tab="coins">金币</button>
          <button class="font-bold text-sm px-5 py-2 rounded-full shop-tab ${activeTab === 'diamonds' ? 'tag tag-yellow' : 'bg-surface-container text-on-surface-variant'}" data-tab="diamonds">钻石</button>
          <button class="font-bold text-sm px-5 py-2 rounded-full shop-tab ${activeTab === 'props' ? 'tag tag-yellow' : 'bg-surface-container text-on-surface-variant'}" data-tab="props">道具</button>
        </section>

        <!-- 新手大礼包 -->
        ${activeTab === 'coins' ? `
        <section class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-tertiary to-tertiary-dim p-5 text-on-tertiary">
          <div class="tag tag-red mb-2 inline-block text-xs">限时特惠</div>
          <h3 class="text-xl font-headline font-extrabold">新手大礼包</h3>
          <p class="text-sm opacity-80 mt-1">内含 5,000,000 金币 +<br/>限定头像框</p>
          <button class="mt-3 bg-white/20 hover:bg-white/30 text-white font-bold px-5 py-2 rounded-full text-sm transition-colors backdrop-blur-sm shop-buy-btn" data-item="starter_pack">
            立即抢购 ¥6.00
          </button>
          <div class="absolute right-4 top-1/2 -translate-y-1/2 text-6xl opacity-30">🎁</div>
        </section>
        ` : ''}

        <!-- 商品网格 -->
        <section class="grid grid-cols-2 gap-4" id="shop-items">
          ${SHOP_ITEMS[activeTab].map(item => _renderShopItem(item)).join('')}
        </section>
      </main>
    `;

    // 绑定事件
    _bindEvents(page);
  }

  function _bindEvents(page) {
    // Tab 切换
    page.querySelectorAll('.shop-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeTab = tab.dataset.tab;
        render();
      });
    });

    // 购买按钮
    page.querySelectorAll('.shop-buy-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const itemId = btn.dataset.item;
        if (!itemId) {
          _showShopToast(page, '该商品即将推出');
          return;
        }
        await _handlePurchase(itemId, page);
      });
    });
  }

  render();
  return page;
}

function _renderShopItem(item) {
  const isDashed = item.isDashed;
  const hasAction = item.id != null;

  return `
    <div class="card-elevated flex flex-col items-center py-5 px-4 rounded-2xl cursor-pointer hover:scale-[1.02] transition-transform active:scale-95 relative ${isDashed ? 'border-2 border-dashed border-outline-variant/30' : 'border-2 border-outline-variant/15'}">
      ${item.tag ? `<div class="absolute -top-1 -right-1 tag tag-red text-[10px]">${item.tag}</div>` : ''}
      <div class="text-4xl mb-3">${item.emoji}</div>
      <h4 class="text-sm font-headline font-extrabold text-on-surface text-center">${item.name}</h4>
      <p class="text-[11px] text-on-surface-variant mt-0.5">${item.desc}</p>
      <button class="mt-3 ${isDashed ? 'bg-surface-container text-on-surface-variant' : 'bg-secondary/10 text-secondary'} font-bold text-sm px-5 py-1.5 rounded-full shop-buy-btn" data-item="${item.id || ''}">
        ${item.price}
      </button>
    </div>
  `;
}

async function _handlePurchase(itemId, page) {
  const token = localStorage.getItem('token');
  if (!token) return;

  // 确认弹窗
  const item = [...SHOP_ITEMS.coins, ...SHOP_ITEMS.diamonds, ...SHOP_ITEMS.props,
  { id: 'starter_pack', name: '新手大礼包', price: '¥6.00' }
  ].find(i => i.id === itemId);

  if (!item) return;

  // 简易确认
  const confirmed = confirm(`确认购买「${item.name}」？\n价格: ${item.price}`);
  if (!confirmed) return;

  try {
    const res = await fetch('/api/auth/shop/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ itemId })
    });
    const json = await res.json();

    if (json.code === 0) {
      const data = json.data;
      // 更新 store
      store.update('player', {
        chips: data.totalChips,
        diamonds: data.totalDiamonds
      });
      // 更新本地缓存
      const snapshot = JSON.parse(localStorage.getItem('playerSnapshot') || '{}');
      snapshot.chips = data.totalChips;
      snapshot.diamonds = data.totalDiamonds;
      localStorage.setItem('playerSnapshot', JSON.stringify(snapshot));

      // 更新页面展示
      const chipsEl = page.querySelector('#shop-chips');
      const diamondsEl = page.querySelector('#shop-diamonds');
      if (chipsEl) chipsEl.textContent = data.totalChips.toLocaleString();
      if (diamondsEl) diamondsEl.textContent = data.totalDiamonds;

      const rewardLabel = data.rewardType === 'chips' ? '金币' : data.rewardType === 'diamonds' ? '钻石' : '道具';
      _showShopToast(page, `购买成功！获得 ${data.rewardAmount.toLocaleString()} ${rewardLabel} 🎉`);
    } else {
      _showShopToast(page, json.message || '购买失败');
    }
  } catch (e) {
    _showShopToast(page, '网络错误，请稍后重试');
  }
}

function _showShopToast(page, message) {
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:10000;background:#333;color:#fff;padding:10px 24px;border-radius:24px;font-size:14px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.3);animation:fadeInOut 2.5s ease;';
  toast.textContent = message;
  const style = document.createElement('style');
  style.textContent = '@keyframes fadeInOut{0%{opacity:0;transform:translateX(-50%) translateY(-8px)}10%{opacity:1;transform:translateX(-50%)}80%{opacity:1}100%{opacity:0;transform:translateX(-50%) translateY(-8px)}}';
  toast.appendChild(style);
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}
