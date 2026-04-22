"""載入 .env(若存在)"""
from pathlib import Path
import os
def load():
    env = Path(__file__).parent.parent / ".env"
    if not env.exists(): return
    for line in env.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line: continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())
load()
