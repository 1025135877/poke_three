/**
 * 筹码渲染组件 — 逼真筹码样式 + 飞行动画
 */

// 筹码面值配置：颜色方案
const CHIP_DEFS = [
    { value: 1000, bg: '#7c3aed', stripe: '#fbbf24', label: '1K', shadow: '#5b21b6' },
    { value: 500, bg: '#1e1e1e', stripe: '#fbbf24', label: '500', shadow: '#000000' },
    { value: 100, bg: '#059669', stripe: '#ffffff', label: '100', shadow: '#047857' },
    { value: 50, bg: '#dc2626', stripe: '#ffffff', label: '50', shadow: '#b91c1c' },
    { value: 10, bg: '#e5e7eb', stripe: '#3b82f6', label: '10', shadow: '#9ca3af' }
];

/**
 * 根据金额贪心拆分成筹码组合
 * @param {number} amount 金额
 * @returns {Array<{def: Object, count: number}>} 筹码组合
 */
function splitChips(amount) {
    const result = [];
    let remaining = amount;
    for (const def of CHIP_DEFS) {
        const count = Math.floor(remaining / def.value);
        if (count > 0) {
            // 每种面值最多显示 5 枚，避免堆积过多
            result.push({ def, count: Math.min(count, 5) });
            remaining -= count * def.value;
        }
    }
    // 如果金额太小不够最小面值，至少显示 1 枚最小筹码
    if (result.length === 0) {
        result.push({ def: CHIP_DEFS[CHIP_DEFS.length - 1], count: 1 });
    }
    return result;
}

/**
 * 创建单个筹码 DOM 元素
 * @param {Object} def 筹码定义
 * @param {number} size 筹码直径(px)
 * @returns {HTMLElement}
 */
function createChipEl(def, size = 32) {
    const chip = document.createElement('div');
    chip.className = 'poker-chip';
    chip.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    background: conic-gradient(
      ${def.stripe} 0deg, ${def.bg} 15deg,
      ${def.bg} 30deg, ${def.stripe} 30deg,
      ${def.stripe} 45deg, ${def.bg} 45deg,
      ${def.bg} 75deg, ${def.stripe} 75deg,
      ${def.stripe} 90deg, ${def.bg} 90deg,
      ${def.bg} 120deg, ${def.stripe} 120deg,
      ${def.stripe} 135deg, ${def.bg} 135deg,
      ${def.bg} 165deg, ${def.stripe} 165deg,
      ${def.stripe} 180deg, ${def.bg} 180deg,
      ${def.bg} 210deg, ${def.stripe} 210deg,
      ${def.stripe} 225deg, ${def.bg} 225deg,
      ${def.bg} 255deg, ${def.stripe} 255deg,
      ${def.stripe} 270deg, ${def.bg} 270deg,
      ${def.bg} 300deg, ${def.stripe} 300deg,
      ${def.stripe} 315deg, ${def.bg} 315deg,
      ${def.bg} 345deg, ${def.stripe} 345deg,
      ${def.stripe} 360deg
    );
    border-radius: 50%;
    position: relative;
    box-shadow: 0 2px 4px rgba(0,0,0,0.4), inset 0 0 0 ${size * 0.08}px ${def.shadow}, inset 0 0 0 ${size * 0.12}px rgba(255,255,255,0.15);
    flex-shrink: 0;
  `;

    // 中间面值圆圈
    const inner = document.createElement('div');
    const innerSize = size * 0.55;
    inner.style.cssText = `
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: ${innerSize}px;
    height: ${innerSize}px;
    border-radius: 50%;
    background: ${def.bg};
    border: 1.5px solid rgba(255,255,255,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: ${size * 0.22}px;
    font-weight: 900;
    color: ${def.stripe};
    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    letter-spacing: -0.5px;
  `;
    inner.textContent = def.label;
    chip.appendChild(inner);

    return chip;
}

/**
 * 渲染筹码堆 — 在奖池中心展示
 * @param {number} amount 金额
 * @returns {HTMLElement}
 */
export function renderChipStack(amount) {
    const container = document.createElement('div');
    container.className = 'chip-stack';
    container.style.cssText = 'display:flex; gap:4px; align-items:flex-end; justify-content:center; position:relative;';

    if (amount <= 0) return container;

    const chips = splitChips(amount);

    chips.forEach(({ def, count }) => {
        // 每组筹码堆叠
        const column = document.createElement('div');
        column.style.cssText = 'display:flex; flex-direction:column-reverse; align-items:center; position:relative;';

        for (let i = 0; i < count; i++) {
            const chip = createChipEl(def, 28);
            // 堆叠偏移：每层上移一点
            chip.style.marginBottom = i > 0 ? '-20px' : '0';
            chip.style.zIndex = i;
            column.appendChild(chip);
        }
        container.appendChild(column);
    });

    return container;
}

/**
 * 创建飞行筹码动画 — 从 fromEl 飞向 toEl
 * @param {HTMLElement} fromEl 起始元素（玩家座位）
 * @param {HTMLElement} toEl 目标元素（奖池中心）
 * @param {number} amount 下注金额
 * @param {function} [onDone] 动画完成回调
 */
export function createFlyingChip(fromEl, toEl, amount, onDone) {
    if (!fromEl || !toEl) {
        onDone?.();
        return;
    }

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    // 根据金额选择筹码外观
    const chips = splitChips(amount);
    const mainDef = chips[0]?.def || CHIP_DEFS[CHIP_DEFS.length - 1];

    // 生成 2~4 个飞行筹码，错开时间
    const chipCount = Math.min(Math.max(2, chips.reduce((s, c) => s + c.count, 0)), 4);

    for (let i = 0; i < chipCount; i++) {
        const def = chips[Math.min(i, chips.length - 1)]?.def || mainDef;
        setTimeout(() => {
            _animateSingleChip(def, fromRect, toRect, i === chipCount - 1 ? onDone : null);
        }, i * 80);
    }
}

/**
 * 单个筹码飞行动画内部实现
 */
function _animateSingleChip(def, fromRect, toRect, onDone) {
    const chip = createChipEl(def, 32);
    chip.style.position = 'fixed';
    chip.style.zIndex = '9999';
    chip.style.left = `${fromRect.left + fromRect.width / 2 - 16}px`;
    chip.style.top = `${fromRect.top + fromRect.height / 2 - 16}px`;
    chip.style.pointerEvents = 'none';
    chip.style.transition = 'none';

    document.body.appendChild(chip);

    // 随机添加微小偏移，让多个筹码不完全重叠
    const offsetX = (Math.random() - 0.5) * 20;
    const offsetY = (Math.random() - 0.5) * 10;

    const deltaX = (toRect.left + toRect.width / 2 - 16) - (fromRect.left + fromRect.width / 2 - 16) + offsetX;
    const deltaY = (toRect.top + toRect.height / 2 - 16) - (fromRect.top + fromRect.height / 2 - 16) + offsetY;

    // 使用 Web Animations API 实现弧线飞行
    const animation = chip.animate([
        {
            transform: 'translate(0, 0) scale(1.2) rotate(0deg)',
            opacity: 1
        },
        {
            // 中间帧：抛物线最高点
            transform: `translate(${deltaX * 0.5}px, ${deltaY * 0.5 - 40}px) scale(1) rotate(180deg)`,
            opacity: 1,
            offset: 0.5
        },
        {
            transform: `translate(${deltaX}px, ${deltaY}px) scale(0.8) rotate(360deg)`,
            opacity: 1
        }
    ], {
        duration: 500,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fill: 'forwards'
    });

    animation.onfinish = () => {
        // 着陆效果：脉冲缩放
        chip.animate([
            { transform: `translate(${deltaX}px, ${deltaY}px) scale(1.2)`, opacity: 1 },
            { transform: `translate(${deltaX}px, ${deltaY}px) scale(0)`, opacity: 0 }
        ], {
            duration: 250,
            easing: 'ease-out',
            fill: 'forwards'
        }).onfinish = () => {
            chip.remove();
            onDone?.();
        };
    };
}

/**
 * 创建筹码图标（小尺寸，用于座位旁边展示）
 * @param {number} size 尺寸
 * @returns {HTMLElement}
 */
export function createChipIcon(size = 16) {
    const def = CHIP_DEFS[2]; // 绿色筹码
    return createChipEl(def, size);
}
