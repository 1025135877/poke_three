/**
 * 头像工具 — 使用本地 DiceBear 库生成 SVG 头像
 * 替代外部 API：https://api.dicebear.com/7.x/adventurer/svg?seed=xxx
 */
import { createAvatar } from '@dicebear/core';
import { adventurer } from '@dicebear/collection';

// 缓存已生成的头像 data URI，避免重复计算
const avatarCache = new Map();

/**
 * 根据 seed 生成头像 data URI
 * @param {string} seed - 头像种子（通常是用户名或 ID）
 * @returns {string} data:image/svg+xml 格式的 URI
 */
export function getAvatarUrl(seed) {
    if (!seed) seed = 'default';

    // 优先从缓存读取
    if (avatarCache.has(seed)) {
        return avatarCache.get(seed);
    }

    // 使用 DiceBear 本地生成 SVG
    const avatar = createAvatar(adventurer, { seed });
    const svgString = avatar.toString();

    // 编码为 data URI
    const dataUri = `data:image/svg+xml,${encodeURIComponent(svgString)}`;

    // 写入缓存
    avatarCache.set(seed, dataUri);

    return dataUri;
}
