import os
import urllib.request

AUDIO_DIR = r"d:\ideaProject\poke_three\frontend\public\audio"

FILES = {
    # 欢快大厅背景 (开源无版权示例片段)
    "bgm_lobby.mp3": "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3",
    # 紧张对局背景
    "bgm_game.mp3": "https://cdn.pixabay.com/download/audio/2022/10/25/audio_44be35987f.mp3",
    # 筹码音效
    "fx_chips.mp3": "https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3",
    # 胜利音效
    "fx_win.mp3": "https://cdn.pixabay.com/download/audio/2021/08/04/audio_bb630cc098.mp3",
    # 失败音效
    "fx_lose.mp3": "https://cdn.pixabay.com/download/audio/2022/11/21/audio_18c5e63897.mp3"
}

def download_files():
    print("正在下载背景音乐和系统音效...")
    for filename, url in FILES.items():
        filepath = os.path.join(AUDIO_DIR, filename)
        if not os.path.exists(filepath):
            try:
                # 简单添加 User-Agent 以防止 403
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req) as response, open(filepath, 'wb') as out_file:
                    out_file.write(response.read())
                print(f"Downloaded: {filename}")
            except Exception as e:
                print(f"Failed to download {filename}: {e}")
                # 如果下载失败，为了防止报错，创建一个空的 mp3 文件（避免 404，虽然没声音）
                open(filepath, 'w').close()
        else:
            print(f"File exists: {filename}")

if __name__ == "__main__":
    download_files()
