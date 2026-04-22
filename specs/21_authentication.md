# 🔐 身份驗證與資料安全規格書

> 沒有登入,你的交易紀錄、資產、偏好全公開在網上。
> 這份規格保護你的數位身份。

---

# 🎯 三大問題要解決

1. **Vincent 怎麼登入?**
2. **誰能存取你的資料?**
3. **如果被盜,怎辦?**

---

# 🔑 認證方案(三選一,推薦 B)

## 方案 A:**Supabase Auth**(最容易)

```python
# Supabase 內建,最省事
supabase.auth.sign_in_with_password(
    email="vincent@example.com",
    password="xxxxx"
)
```

**優點:**
- ✅ 和資料庫整合
- ✅ 內建 Email 驗證
- ✅ 免費

**缺點:**
- ❌ 要記密碼
- ❌ 手機登入麻煩

---

## 方案 B:**LINE Login**(推薦)⭐

```python
# 因為你本來就用 LINE 接收通知
# 登入也用 LINE → 一個系統搞定
```

**優點:**
- ✅ 手機用超方便(已經在 LINE)
- ✅ 跟 LINE 推播無縫整合
- ✅ 不用記密碼
- ✅ LINE 本身就是 2FA

**缺點:**
- ❌ 桌面登入較麻煩(要掃 QR)

**實作:**
```python
# 使用 LINE Login v2.1
# https://developers.line.biz/en/docs/line-login/

class LineLoginService:
    async def get_login_url(self) -> str:
        return (
            f"https://access.line.me/oauth2/v2.1/authorize?"
            f"response_type=code&"
            f"client_id={LINE_CHANNEL_ID}&"
            f"redirect_uri={CALLBACK_URL}&"
            f"state={nonce}&"
            f"scope=profile%20openid"
        )
    
    async def handle_callback(self, code: str) -> dict:
        # 交換 token
        token_response = await exchange_code_for_token(code)
        
        # 取得用戶資訊
        user_info = await get_line_user_profile(token_response.access_token)
        
        # 與 Supabase 用戶對應
        user = await match_or_create_user(user_info)
        
        return {
            "user_id": user.id,
            "access_token": create_jwt(user),
            "line_user_id": user_info.userId,
        }
```

---

## 方案 C:**Google Login**(也可以)

```python
# 適合桌面為主的使用者
# 但你用手機多 → 不如 LINE Login
```

---

# 🛡 JWT Token 管理

## Token 分類

```python
TOKEN_TYPES = {
    "access_token": {
        "lifetime": timedelta(hours=1),   # 短,減少被盜風險
        "use_case": "API 呼叫",
    },
    "refresh_token": {
        "lifetime": timedelta(days=30),  # 長,省得常登入
        "use_case": "換新的 access token",
    },
    "trade_confirmation_token": {
        "lifetime": timedelta(minutes=5),  # 極短
        "use_case": "下單前再次驗證",
    },
}
```

## Token 實作

```python
# utils/auth.py

import jwt
from datetime import datetime, timedelta

SECRET = os.getenv("JWT_SECRET")  # 儲存在 GitHub Secrets

def create_access_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "access",
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=1),
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")


def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise TokenExpiredError()
    except jwt.InvalidTokenError:
        raise InvalidTokenError()


# FastAPI dependency
async def require_auth(
    authorization: str = Header(...)
) -> str:
    """
    所有需要登入的 API 都用這個
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Invalid auth header")
    
    token = authorization.split()[1]
    payload = verify_token(token)
    
    if payload["type"] != "access":
        raise HTTPException(401, "Wrong token type")
    
    return payload["sub"]  # user_id
```

---

# 🔒 敏感資料保護

## 什麼是敏感資料?

```
高度敏感(加密儲存):
 🔴 持股明細
 🔴 實際資產金額
 🔴 交易紀錄
 🔴 API Keys

中度敏感(限制讀取):
 🟡 自選股
 🟡 偏好設定
 🟡 對話歷史

低敏感(可公開):
 🟢 系統推薦(匿名化)
 🟢 回測結果
```

## 加密實作

```python
# utils/encryption.py

from cryptography.fernet import Fernet

class DataEncryption:
    """
    敏感資料加密
    """
    def __init__(self):
        # 金鑰存在 GitHub Secrets,不在資料庫
        self.cipher = Fernet(os.getenv("DATA_ENCRYPTION_KEY"))
    
    def encrypt(self, data: str) -> str:
        """加密"""
        return self.cipher.encrypt(data.encode()).decode()
    
    def decrypt(self, encrypted: str) -> str:
        """解密"""
        return self.cipher.decrypt(encrypted.encode()).decode()


# 使用範例
encryption = DataEncryption()

# 存入資料庫時
encrypted_pnl = encryption.encrypt(str(actual_pnl))
supabase.table("user_trades").insert({
    "stock_id": "2317",
    "pnl_encrypted": encrypted_pnl,
})

# 讀取時
record = supabase.table("user_trades").select("*").execute()
actual_pnl = float(encryption.decrypt(record.pnl_encrypted))
```

---

# 🛡 Supabase RLS(Row Level Security)

```sql
-- 每個 table 都設 RLS
ALTER TABLE user_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

-- 只有本人能看自己的資料
CREATE POLICY "users_see_own_trades" ON user_trades
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "users_see_own_settings" ON user_settings
    FOR ALL USING (user_id = auth.uid()::text);

-- 推薦是全部用戶共用(但不含個人決策)
CREATE POLICY "users_see_public_recs" ON recommendations
    FOR SELECT USING (true);
```

---

# 🚨 安全監控

## 可疑活動偵測

```python
async def monitor_security_events(user_id: str):
    """
    監控不尋常的活動
    """
    events = [
        {
            "type": "unusual_ip",
            "trigger": "登入 IP 跟過去不同國家",
            "action": "LINE 通知 + 要求重新驗證",
        },
        {
            "type": "multiple_failures",
            "trigger": "5 次登入失敗",
            "action": "鎖帳號 15 分鐘",
        },
        {
            "type": "unusual_time",
            "trigger": "凌晨 3 點登入(Vincent 睡覺時)",
            "action": "LINE 通知確認",
        },
        {
            "type": "large_data_export",
            "trigger": "短時間內下載大量資料",
            "action": "暫停 + 通知",
        },
    ]
```

---

# 🆘 帳號被盜應變

## 緊急停用流程

```
情境:Vincent 發現帳號被盜(或懷疑)

Step 1: 從 LINE 點「緊急停用」
 → 所有 Token 立即失效
 → 停用所有排程
 → 停用 API 存取

Step 2: 驗證身份
 → LINE 認證
 → Email 驗證
 → 或 SMS 驗證(若有設)

Step 3: 重設安全設定
 → 重新產生 API Keys
 → 重設 JWT Secret
 → 檢查最近活動

Step 4: 恢復運作
```

---

# 📱 UI:登入流程

```
┌─────────────────────────────────────┐
│                                     │
│      🔐 Vincent Stock System        │
│                                     │
│      📈 你的個人金融情報系統          │
│                                     │
│    ┌───────────────────────────┐   │
│    │                             │   │
│    │   💚 用 LINE 登入           │   │
│    │   [推薦]                    │   │
│    │                             │   │
│    └───────────────────────────┘   │
│                                     │
│    ┌───────────────────────────┐   │
│    │   🔵 用 Google 登入         │   │
│    └───────────────────────────┘   │
│                                     │
│    ┌───────────────────────────┐   │
│    │   📧 用 Email + 密碼        │   │
│    └───────────────────────────┘   │
│                                     │
│    第一次使用?[建立帳號]             │
│                                     │
└─────────────────────────────────────┘
```

---

# 🎯 Vincent 會得到什麼?

1. ✅ 不用記密碼(LINE 一鍵登入)
2. ✅ 交易紀錄加密保存
3. ✅ 可疑登入自動警告
4. ✅ 帳號被盜有緊急停用
5. ✅ 符合資安基本盤
