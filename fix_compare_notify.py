# -*- coding: utf-8 -*-
import pathlib

p = pathlib.Path(r'd:\ideaProject\poke_three\frontend\src\ws.js')
content = p.read_text(encoding='utf-8')

# 找到 _showCompareResult 方法中的弹窗插入点
# 在 "document.body.appendChild(overlay);" 前面添加前置通知逻辑
old_append = """        document.body.appendChild(overlay);
        overlay.addEventListener('click', () => overlay.remove());
        setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 3500);
    }"""

new_append = """        // 如果我是被比牌的目标，先显示一个醒目的前置通知
        const isTarget = data.targetId === myId;
        const isChallenger = data.challengerId === myId;
        if (isTarget || isChallenger) {
            const preNotice = document.createElement('div');
            preNotice.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:10001;padding:10px 24px;border-radius:16px;font-size:14px;font-weight:800;box-shadow:0 4px 20px rgba(0,0,0,0.4);animation:compareNotify 1s ease;display:flex;align-items:center;gap:8px;';
            if (isTarget) {
                preNotice.style.background = 'linear-gradient(135deg, rgba(239,68,68,0.95), rgba(168,85,247,0.95))';
                preNotice.style.color = 'white';
                preNotice.innerHTML = `<span style="font-size:22px;">⚔️</span><span>${challenger.name} 向你发起了比牌！</span>`;
            } else {
                preNotice.style.background = 'linear-gradient(135deg, rgba(59,130,246,0.95), rgba(99,102,241,0.95))';
                preNotice.style.color = 'white';
                preNotice.innerHTML = `<span style="font-size:22px;">⚔️</span><span>你向 ${target.name} 发起了比牌</span>`;
            }
            const noticeStyle = document.createElement('style');
            noticeStyle.textContent = '@keyframes compareNotify{0%{opacity:0;transform:translateX(-50%) scale(0.8)}15%{opacity:1;transform:translateX(-50%) scale(1.05)}25%{transform:translateX(-50%) scale(1)}100%{opacity:1;transform:translateX(-50%)}}';
            preNotice.appendChild(noticeStyle);
            document.body.appendChild(preNotice);
            setTimeout(() => preNotice.remove(), 3000);
        }

        document.body.appendChild(overlay);
        // 自己参与的比牌：需要点击关闭，停留更久；旁观者：3.5秒自动消失
        if (isMyFight) {
            overlay.addEventListener('click', () => overlay.remove());
            setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 8000);
        } else {
            overlay.addEventListener('click', () => overlay.remove());
            setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 3500);
        }
    }"""

content = content.replace(old_append, new_append)

p.write_text(content, encoding='utf-8')
print('Done! Compare notification patched.')
