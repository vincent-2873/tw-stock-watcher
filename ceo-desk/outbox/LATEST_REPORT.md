# 任務 #004 報告 — 呱呱視覺三處精修(Vincent QA 後)

## 任務
修復 Vincent 看到 hero 上線後發現的 3 個視覺問題

## 狀態
✅ **成功**

## 時間
- Push 完成:2026-04-24 **16:54:23 TPE**
- 線上偵測到新版:**16:59:06 TPE**(Zeabur 部署 **269 秒** = 4.5 分鐘)
- 驗證完成:2026-04-24 **17:00 TPE**
- 全程:含改 + 本地測 + 等 deploy + 線上驗證 ~30 分鐘

---

## ✅ 三處全部上線驗證

### 1. Hero 中央呱呱(問題 1+2:沒去背 + 太小)

| 檢查 | 結果 |
|---|---|
| 圖片 Content-Length | **174,406 bytes**(去背版,確認) |
| 圖片 Content-Type | `image/png` |
| Hero wrapper class | `quackImageLink`,CSS 320px 圓圈內 290px 圖(填 91%) |
| 動畫初始狀態 | `opacity:0; scale(0.85)`(等 framer-motion 啟動) |
| 動畫保留 | 淡入 + 漂浮 + 搖擺 + hover + click → /chat |

**從 DOM 看**:`<a href="/chat" class="quackImageLink"><div class="quackImage" style="opacity:0;..."><img alt="呱呱 — 呱呱投資招待所所主" .../></div></a>`

### 2. 左上角 logo(問題 3a)

| 檢查 | 結果 |
|---|---|
| Logo 內元素 | `<img alt="呱呱投資招待所" width="40" height="40">` |
| 原 emoji | ✅ 已移除 |
| Hover 動畫 | 保留(rotate -8° + scale 1.1x) |

### 3. 右下角全站 floating(問題 3b)

| 檢查 | 結果 |
|---|---|
| 浮鈕 class | `fixed bottom-6 right-6` ✅ |
| QuackAvatar 內 | `<span aria-label="呱呱" width:48px><img alt="呱呱" width=48 height=48></span>` |
| 全站共用 | ✅ QuackAvatar 改一處,全站凡用此 component 都升級 |
| 動畫 | calm/thinking/observing/sleeping 4 種狀態切換照舊 |

### 額外健康指標

| 項目 | 數值 |
|---|---|
| 首頁 HTTP | 200 in **0.60s** |
| 圖片 14 處 references in HTML | ✅(srcSet 1x/2x + preload + 3 個位置 = 預期內) |
| Cache-Control(HTML) | `private, no-cache, no-store, must-revalidate` ✅ |

---

## 🤔 任何視覺怪怪的地方?

**從技術 DOM / build / response 看 — 沒有**。
但**我無法實際渲染畫面看視覺**,以下是「預期」應該的樣子,你親眼開頁面確認:

| 地方 | 預期 | 你需要看 |
|---|---|---|
| Hero 中央 | 呱呱填滿米色圓圈 ~91%,周圍只剩薄薄一圈 | 圖會不會「太擠」?太貼邊? |
| Hero 動畫 | 0.8s 淡入 → 漂浮 + 搖擺 | 動畫流暢嗎?手機上會不會卡? |
| Logo | 40px 完整呱呱在「呱呱投資招待所」字樣旁 | 大小比例配字體看順眼嗎? |
| Floating 浮鈕 | 48px 呱呱頭像在右下圓角按鈕內 | 在白底卡片背景上去背邊緣看得出來嗎? |
| 透明邊緣 | remove.bg 的去背通常很乾淨 | 仔細看頭頂 / 服裝邊有無殘留白邊? |

如果有任何一個你覺得不對,告訴我,我馬上修。

---

## 📦 Git 變動

```
066b795 Merge branch 'hotfix/guagua-refine-2026-04-24'   ← 當前 main
119a489 feat(brand): 🦆 呱呱視覺三處精修
cd55db1 Merge branch 'hotfix/guagua-hero-2026-04-24'     ← 前一版(Hero v1)
```

5 個檔變動:
```
M  ceo-desk/assets/characters/guagua/guagua_official_v1.png   1.14 MB → 174 KB
M  frontend/public/characters/guagua_official_v1.png          同步
M  frontend/src/app/page.module.css                          .quackImageLink 240→290
M  frontend/src/app/page.tsx                                 logo emoji → Image
M  frontend/src/components/quack/QuackAvatar.tsx             全 4 size emoji → Image
```

---

## 🆘 Rollback(備用,目前不需)

```bash
git revert --no-edit 066b795   # 回到 cd55db1 (Hero v1, 有方底版)
git push origin main
# 不會回到 emoji 版本(因為 cd55db1 已經是 Hero PNG 版了)
# 若要連 Hero PNG 都退,再 revert cd55db1 一次
```

---

## 🎯 建議 Vincent 下一步

| 候選 | 預估 | 為什麼適合 |
|---|---|---|
| 🎨 **6 個其他 agents 視覺生成 prompt 起草** | 30-45 分鐘 | 趁呱呱本尊上線氣勢正旺,接著生其他角色 |
| 📝 PRODUCT_VISION.md 色盤同步到 v1 實際色 | 5 分鐘 | 順手清債(現在 v1 色盤跟 PRODUCT_VISION 略有差異) |
| 🛠️ Phase 2.2 產業熱力圖 backend(技術線) | 1.5-2 小時 | 想換腦袋做點工程 |
| 🌙 收工 | 0 分鐘 | 已經完成兩個有意義的任務,可以停 |

**CTO 視角建議**:你今晚已經完成
- 凌晨稽核(系統健康度確認)
- 端點飢餓修復(底層架構)
- 呱呱 Visual v1.0 入庫(品牌資產)
- 呱呱 Hero 上線 + 三處精修(對外形象)

「**先收工,明天用清醒的腦袋繼續**」是個合理選項。或者如果你還想做點「設計腦」的事,可以起草其他 6 agents 的生成 prompt(不用立刻產圖)。

---

## 💬 給 Vincent 的白話話

> 🦆 **呱呱精修版正式上線,請看 outbox**(就是這份)。
>
> 三處全換完:Hero 變大去背、左上 logo、右下浮鈕。**從技術角度確認全綠**,但實際視覺得你親眼看 — 打開首頁刷新 (Ctrl+F5 確保不吃舊快取) 直接驗收。
>
> 有任何一個不對(比如 Hero 太貼圓圈邊、logo 太小、邊緣有殘留白底)就回我「Hero 太擠」/「邊緣有殘留」之類具體描述,我馬上微調。
>
> 沒問題的話,下一步候選見上面表。**我比較推薦先收工**(今晚成果已經多到可以開香檳),但如果還想做設計工作,「6 agents prompt 起草」是最順手的接續。
