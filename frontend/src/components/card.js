/**
 * 扑克牌组件
 * 支持正面和背面渲染
 */

// 花色符号和颜色映射
const SUIT_CONFIG = {
    hearts: { symbol: '♥', name: '红桃', color: 'red', icon: 'favorite' },
    diamonds: { symbol: '♦', name: '方块', color: 'red', icon: 'diamond' },
    clubs: { symbol: '♣', name: '梅花', color: 'black', icon: 'club' },
    spades: { symbol: '♠', name: '黑桃', color: 'black', icon: 'spade' }
};

/**
 * 渲染一张扑克牌（正面）
 * @param {Object} card {suit, value, display}
 * @param {Object} options {size, animate, onClick}
 */
export function renderCard(card, options = {}) {
    const { size = 'md', animate = false, onClick = null } = options;
    const config = SUIT_CONFIG[card.suit] || SUIT_CONFIG.hearts;
    const isRed = config.color === 'red';

    const sizeClasses = {
        sm: 'w-16 h-24 text-sm',
        md: 'w-24 h-36 text-lg',
        lg: 'w-32 h-48 text-2xl'
    };

    const el = document.createElement('div');
    el.className = `poker-card ${isRed ? 'red' : 'black'} ${sizeClasses[size] || sizeClasses.md} ${animate ? 'animate-bounce-in' : ''}`;

    el.innerHTML = `
    <span class="absolute top-1.5 left-2.5 font-headline font-extrabold text-inherit leading-none">${card.display}</span>
    <span class="text-4xl select-none" style="line-height: 1;">${config.symbol}</span>
    <span class="absolute bottom-1.5 right-2.5 font-headline font-extrabold text-inherit leading-none rotate-180">${card.display}</span>
  `;

    if (onClick) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => onClick(card));
    }

    return el;
}

/**
 * 渲染牌背面
 */
export function renderCardBack(options = {}) {
    const { size = 'md' } = options;

    const sizeClasses = {
        sm: 'w-16 h-24',
        md: 'w-24 h-36',
        lg: 'w-32 h-48'
    };

    const el = document.createElement('div');
    el.className = `poker-card-back ${sizeClasses[size] || sizeClasses.md}`;

    el.innerHTML = `
    <div class="w-full h-full rounded-lg border-2 border-primary-container/30 flex items-center justify-center">
      <span class="text-primary-container text-3xl font-bold opacity-50">🃏</span>
    </div>
  `;

    return el;
}

/**
 * 渲染手牌区域（3张牌的扇形排列）
 */
export function renderHandCards(cards, options = {}) {
    const { looked = false, onLook = null } = options;

    const container = document.createElement('div');
    container.className = 'flex items-end justify-center gap-[-8px] relative';
    container.style.perspective = '600px';

    if (looked && cards && cards.length > 0) {
        // 显示正面
        cards.forEach((card, i) => {
            const rotation = (i - 1) * 8;
            const translateY = Math.abs(i - 1) * 6;
            const cardEl = renderCard(card, { size: 'md', animate: true });
            cardEl.style.transform = `rotate(${rotation}deg) translateY(${translateY}px)`;
            cardEl.style.zIndex = i + 1;
            cardEl.style.animationDelay = `${i * 0.1}s`;
            container.appendChild(cardEl);
        });
    } else {
        // 显示背面（可点击看牌）
        for (let i = 0; i < 3; i++) {
            const rotation = (i - 1) * 8;
            const translateY = Math.abs(i - 1) * 6;
            const cardEl = renderCardBack({ size: 'md' });
            cardEl.style.transform = `rotate(${rotation}deg) translateY(${translateY}px)`;
            cardEl.style.zIndex = i + 1;
            if (onLook) {
                cardEl.style.cursor = 'pointer';
                cardEl.addEventListener('click', onLook);
            }
            container.appendChild(cardEl);
        }
    }

    return container;
}
