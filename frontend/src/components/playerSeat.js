/**
 * 牌桌上的玩家座位组件
 */
import { getAvatarUrl } from '../utils/avatarUtil.js';

// 6个座位的位置配置（相对于牌桌的位置）
export const SEAT_POSITIONS = [
  // 顶部中央
  { top: '-12px', left: '50%', transform: 'translateX(-50%)', align: 'center' },
  // 右上
  { top: '20%', right: '-12px', align: 'right' },
  // 右下
  { top: '60%', right: '-12px', align: 'right' },
  // 左上
  { top: '20%', left: '-12px', align: 'left' },
  // 左下
  { top: '60%', left: '-12px', align: 'left' }
];

/**
 * 获取状态标签的样式
 */
function getStatusTag(player) {
  if (player.hasFolded) {
    return { text: '已弃牌', class: 'bg-outline text-white' };
  }
  if (player.isAllIn) {
    return { text: '全押', class: 'bg-secondary text-white' };
  }
  if (player.hasLooked) {
    return { text: '已看牌', class: 'bg-primary-container text-on-primary-container' };
  }
  return null;
}

/**
 * 渲染玩家座位
 * @param {Object} player 玩家数据
 * @param {boolean} isCurrentTurn 是否当前回合
 * @param {boolean} isSelf 是否自己
 */
export function renderPlayerSeat(player, isCurrentTurn = false, isSelf = false) {
  const status = getStatusTag(player);
  const avatarUrl = getAvatarUrl(player.avatar || player.name || player.id);

  const el = document.createElement('div');
  el.className = 'flex flex-col items-center gap-1';
  el.dataset.playerId = player.id;

  el.innerHTML = `
    <div class="relative ${isCurrentTurn ? 'active-turn' : ''}">
      <div class="w-14 h-14 rounded-full border-4 ${isCurrentTurn ? 'border-primary animate-pulse-glow' : isSelf ? 'border-primary-container' : 'border-white'} bg-surface-container overflow-hidden shadow-md">
        <img src="${avatarUrl}" alt="${player.name}" class="w-full h-full object-cover"
             onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'w-full h-full flex items-center justify-center bg-surface-container-high text-on-surface-variant text-xl font-bold\\'>${player.name[0]}</div>'" />
      </div>
      ${status ? `
        <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 ${status.class} px-2 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap border border-white">${status.text}</div>
      ` : ''}
      ${isCurrentTurn ? `
        <div class="absolute -top-6 left-1/2 -translate-x-1/2 bg-on-surface/80 text-white px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap">思考中...</div>
      ` : ''}
    </div>
    <span class="text-xs font-bold text-on-surface truncate max-w-[70px] text-center">${player.name}${isSelf ? '(我)' : ''}</span>
    <div class="bg-on-surface/80 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
      $ ${(player.chips || 0).toLocaleString()}
    </div>
  `;

  return el;
}
