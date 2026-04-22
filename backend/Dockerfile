# Python backend Docker image for Zeabur
# Zeabur service config: root directory = /backend
# 這個 Dockerfile 預期從 /backend 開始 build

FROM python:3.11-slim

WORKDIR /app

# 系統套件(可選)
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 先 copy requirements 利用 Docker cache
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 再 copy 程式碼到 /app/backend(讓 `from backend.X` 能正常 import)
COPY . ./backend/

# PYTHONPATH 讓 backend 變成 top-level package
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV TZ=Asia/Taipei

EXPOSE 8080

# Zeabur 會把 $PORT 傳進來
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
