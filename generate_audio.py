import os
import asyncio
import edge_tts

AUDIO_DIR = r"d:\ideaProject\poke_three\frontend\public\audio\voice"

VOICES = {
    "male": "zh-CN-YunxiNeural",
    "female": "zh-CN-XiaoxiaoNeural"
}

LINES = {
    "call": "跟注",
    "raise": "加注",
    "fold": "弃牌",
    "allin": "全压！",
    "look": "看牌",
    "compare": "比牌"
}

async def generate():
    if not os.path.exists(AUDIO_DIR):
        os.makedirs(AUDIO_DIR, exist_ok=True)
        
    for action, text in LINES.items():
        # Male
        m_file = os.path.join(AUDIO_DIR, f"m_{action}.mp3")
        communicate = edge_tts.Communicate(text, VOICES["male"], rate="+10%")
        await communicate.save(m_file)
        print(f"Generated: {m_file}")
        
        # Female 
        f_file = os.path.join(AUDIO_DIR, f"f_{action}.mp3")
        communicate = edge_tts.Communicate(text, VOICES["female"], rate="+10%")
        await communicate.save(f_file)
        print(f"Generated: {f_file}")

if __name__ == "__main__":
    asyncio.run(generate())
