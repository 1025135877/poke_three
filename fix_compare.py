# -*- coding: utf-8 -*-
import pathlib

p = pathlib.Path(r'd:\ideaProject\poke_three\frontend\src\ws.js')
content = p.read_text(encoding='utf-8')

# 1. 缩小牌面尺寸: w-10 h-14 -> w-8 h-11, text-[10px] -> text-[9px]
content = content.replace(
    "const sizeClass = size === 'sm' ? 'w-10 h-14 text-[10px]'",
    "const sizeClass = size === 'sm' ? 'w-8 h-11 text-[9px]'"
)

# 2. 缩小花色字号: text-xl -> text-base
content = content.replace(
    "const symbolSize = size === 'sm' ? 'text-xl'",
    "const symbolSize = size === 'sm' ? 'text-base'"
)

# 3. 调整内边距 padding
content = content.replace(
    "const padding = size === 'sm' ? 'top-1 left-1 bottom-1 right-1'",
    "const padding = size === 'sm' ? 'top-0.5 left-0.5 bottom-0.5 right-0.5'"
)

# 4. 去掉卡牌的 mx-0.5, 加 -ml-1 让卡牌紧凑堆叠
content = content.replace(
    'flex-shrink-0 mx-0.5" style="color:',
    'flex-shrink-0" style="margin-left:-2px;color:'
)

# 5. 空卡牌也缩小
content = content.replace(
    "return '<div class=\"w-10 h-14 rounded bg-surface-container opacity-50 mx-0.5 border border-outline-variant/20\"></div>';",
    "return '<div class=\"w-8 h-11 rounded bg-surface-container opacity-50 border border-outline-variant/20\" style=\"margin-left:-2px;\"></div>';"
)

# 6. 去掉重复注释
content = content.replace(
    "        // \u6784\u5efa\u624b\u724c\u663e\u793a\n        // \u6784\u5efa\u624b\u724c\u663e\u793a\n",
    "        // \u6784\u5efa\u624b\u724c\u663e\u793a\n"
)
content = content.replace(
    "        // \u6784\u5efa\u624b\u724c\u663e\u793a\r\n        // \u6784\u5efa\u624b\u724c\u663e\u793a\r\n",
    "        // \u6784\u5efa\u624b\u724c\u663e\u793a\r\n"
)

p.write_text(content, encoding='utf-8')
print('Done! ws.js patched.')
