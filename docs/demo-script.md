# IFMP Retail · I.T. 示範簡報腳本（繁中）

**時長：** 約 18–25 分鐘 · **入口：** `/retail` · **資料：** mock（門禁計數 + 店內攝像雙來源故事）

## 開場（30 秒）

- 產品：**IFMP Retail** — 增收（轉化機會）與降本（人力／能源）同一套營運板
- 標示「I.T. 示範 · 樣本資料」，非正式 I.T. 商標

---

## Beat 0 · 總覽（Overview）

| 動作 | 講點 |
|------|------|
| 開 `/retail` | KPI 卡片、待調度提示、counter / camera 來源標籤 |
| 指向下一步 | 「先看門口真實客流，再看店內動線與缺口」 |

## Beat 1 · 客流（Footfall）

| 動作 | 講點 |
|------|------|
| 進 Footfall | 路過 / 進店 / 流失 / 進店率；每小時趨勢 |
| 指 Source | **門禁計數器** 為門口真實依據（增收敘事起點） |

## Beat 2 · 動線（Journey）

| 動作 | 講點 |
|------|------|
| 熱力圖 + 停留 | 哪裡吸引注意、哪裡只是路過 |
| Top paths | 轉化機會 = 動線 × 停留 |

## Beat 3 · 店內人數（People）

| 動作 | 講點 |
|------|------|
| 顧客 / 員工 / 路過 | 店內 mix |
| 員工每小時 | 誰在場、與後續缺口／排班呼應 |

## Beat 4 · 服務缺口（Service Gap）

| 動作 | 講點 |
|------|------|
| ≥2 分鐘未服務、人手不足／過剩 %、區域 | 服務風險 + 人力浪費訊號 |
| 閱讀門檻 chip | 停留 120s、首次觸客 SLA（可連 Settings） |

## Beat 5 · 缺口 → 調度（Gap → Dispatch）

| 動作 | 講點 |
|------|------|
| 選一筆缺口 → **已調度** | **行動層**：一鍵調度，非只看板 |
| 回 Overview | 待調度數下降（同分頁 session 內） |

## Beat 6 · 排班（Roster）

| 動作 | 講點 |
|------|------|
| 需求 vs 建議／實際圖表 | 降本：人力對齊需求曲線 |
| **週更表** 分頁 | 拖放／編輯班次；衝突提示（mock 持久化） |

## Beat 7 · 營運教練（Coach）

| 動作 | 講點 |
|------|------|
| 區域篩選 | 聚焦問題樓層／區域 |
| VL 摘要列表 | 每週複盤敘事（繁中標籤） |

## Beat 8 · 能源（Energy）

| 動作 | 講點 |
|------|------|
| 監測 + IoT 來源 | .utilities 成本槓桿 |
| **條件式控制** 橫幅 | 商場未必有 HVAC 寫入權；示範僅建議，誠實標示 |

---

## 收尾（可選）

- **Settings：** 門檻 120s / SLA 90s、示範店鋪標籤
- 重申套餐 A（洞察）+ B（調度／排班／教練）+ D（能源短 beat）

---

## 簡報前重置（乾淨 session）

同分頁內 **調度、排班覆寫、設定** 會寫入 `sessionStorage`；主題／語言寫入 `localStorage`。

### 最快方式

1. **關閉分頁再開** `/retail`（清除該 tab 的 sessionStorage）
2. 或 DevTools → Application → Storage → Clear site data（該 origin 全清）

### 精準清除（主控台貼上）

```javascript
[
  'ifmp_retail_dispatches',
  'ifmp_retail_roster_suggested',
  'ifmp_retail_roster_board_assignments',
  'ifmp_retail_settings',
].forEach((k) => sessionStorage.removeItem(k));
location.reload();
```

| Key | 影響 |
|-----|------|
| `ifmp_retail_dispatches` | 已調度標記 |
| `ifmp_retail_roster_suggested` | 需求層建議覆寫 |
| `ifmp_retail_roster_board_assignments` | 週更表編輯 |
| `ifmp_retail_settings` | 門檻覆寫（Settings 頁亦可「恢復預設」） |
| `ifmp_retail_theme` / `ifmp_retail_locale` | 主題、語言（localStorage；通常保留繁中即可） |

### 建議彩排順序

Beat 0 → 1 → 2 → 3 → 4 → **5（調度）** → 6 → 7 → 8；Beat 5 前確認尚未調度，或先執行上方 reset。

---

**部署：** [`docs/deploy-retail.ifmphk.com.md`](deploy-retail.ifmphk.com.md) · **驗收清單：** `docs/superpowers/specs/2026-09-04-ifmp-retail-demo-design.md` §10
