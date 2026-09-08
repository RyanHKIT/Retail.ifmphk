# IFMP Retail · I.T. 示範簡報腳本（繁中）

**時長：** 約 15–20 分鐘 · **入口：** `/retail?demo=1`（選用 presenter 節拍指示） · **資料：** mock（門禁計數 + 店內攝像雙來源故事）

## 開場（30 秒）

- 產品：**IFMP Retail** — 增收（轉化機會）與降本（人力／能源）同一套營運板
- 標示「I.T. 示範 · 樣本資料」，非正式 I.T. 商標
- **Presenter 模式：** URL 加 `?demo=1` → 頂欄顯示節拍 `0/6`…`6/6`，SpineNav「下一步」條 sticky 置頂

---

## Golden path（主線 · Beat 0–6）

跟著各頁 **SpineNav** 的「**下一步**」；Energy 末頁為「**本節完成**」回總覽。

| Beat | 路由 | SpineNav / CTA | 動作與講點 |
|------|------|----------------|------------|
| **0** | `/retail` | 有待調度 → **去服務缺口**；否則 **下一步** → 客流 | 雙源 KPI 狀況帶；counter / camera 來源標籤；**門店切換（銅鑼灣 ↔ 尖沙咀）** 僅切換標籤，共用樣本 |
| **1** | `/retail/footfall` | **下一步** → 動線 | 門口真實客流：過店 / 進店 / 流失 / 進店率；**門禁計數器** 為增收敘事起點 |
| **2** | `/retail/journey` | 點熱區 → `/retail/service-gap?zone=`；**下一步** → 服務缺口 | **示範平面圖** + soft density（非即時影像）；熱力圖 + 停留；轉化機會 = 動線 × 停留 |
| **3** | `/retail/service-gap` | **調度下一則** → 已調度；**去教練** `/retail/coach?gap=&zone=`、**去排班** `/retail/roster?zone=` | ≥{dwell}s 未服務、門檻 chip（連 Settings）；**行動層**一鍵調度 |
| **4** | `/retail/roster` | **下一步** → 教練 | 需求 vs 建議／實際；`?zone=` 高亮週更表站別（入口→樓面、試衣間→試衣、收銀台→收銀） |
| **5** | `/retail/coach` | **下一步** → 能源 | `?gap=` / `?zone=` 預篩；VL 每週複盤敘事 |
| **6** | `/retail/energy` | **本節完成** → 總覽 | IoT 誠實橫幅；條件式控制僅建議、未必有 HVAC 寫入權 |

### Beat 3 後 · 回總覽確認（同 session）

1. 調度一則缺口後，導航回 **總覽** `/retail`
2. **待調度數下降**（同分頁 `retail-dispatch` 事件，無需整頁硬刷新）
3. 再 **下一步** 進排班，延續 Beat 4

---

## 副線 · Settings（可選，同 session）

| 步驟 | 路由 | 講點 |
|------|------|------|
| 1 | `/retail/settings` | 停留門檻（預設 120s）、首次觸客 SLA（90s） |
| 2 | 改 dwell → **儲存** | Gap 規則 chip / 副標即時更新（`retail-settings` 事件） |
| 3 | `/retail/service-gap` | 橫幅文案反映新門檻 |
| 4 | `/retail/coach` | 副標／規則同步（無 remount hack） |

---

## 非主線頁面

- **人員** `/retail/people` — 店內 mix，可略過；不在 golden path SpineNav 鏈上
- **設定** — 見副線

---

## 簡報前重置（乾淨 session）

同分頁內 **調度、排班覆寫、設定、spine focus** 會寫入 `sessionStorage`；主題／語言寫入 `localStorage`。

### 最快方式

1. **關閉分頁再開** `/retail?demo=1`
2. 或 DevTools → Application → Storage → Clear site data

### 精準清除（主控台貼上）

```javascript
[
  'ifmp_retail_dispatches',
  'ifmp_retail_roster_suggested',
  'ifmp_retail_roster_board_assignments',
  'ifmp_retail_settings',
  'ifmp_retail_spine_focus',
].forEach((k) => sessionStorage.removeItem(k));
location.reload();
```

| Key | 影響 |
|-----|------|
| `ifmp_retail_dispatches` | 已調度標記 |
| `ifmp_retail_roster_suggested` | 需求層建議覆寫 |
| `ifmp_retail_roster_board_assignments` | 週更表編輯 |
| `ifmp_retail_settings` | 門檻覆寫 |
| `ifmp_retail_spine_focus` | 動線 zone / 缺口 handoff |
| `ifmp_retail_theme` / `ifmp_retail_locale` | 主題、語言（localStorage；通常保留繁中） |

### 建議彩排順序

**0 → 1 → 2 → 3（調度 + 去教練/排班）→ 回 0 確認待調度降 → 4 → 5 → 6**；Beat 3 前確認尚未調度，或先 reset。

---

**部署：** [`docs/deploy-retail.ifmphk.com.md`](deploy-retail.ifmphk.com.md) · **驗收：** `docs/superpowers/plans/2026-09-07-ifmp-retail-spine-craft.md` golden path
