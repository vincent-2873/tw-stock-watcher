"""載入 .env。若系統已有但為空字串,也會覆蓋(setdefault 不會覆蓋空值)。"""
from pathlib import Path
import os


def load():
    env = Path(__file__).parent.parent / ".env"
    if not env.exists():
        return
    for line in env.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k, v = k.strip(), v.strip()
        if not os.environ.get(k):  # 不存在或空字串都覆蓋
            os.environ[k] = v


load()
