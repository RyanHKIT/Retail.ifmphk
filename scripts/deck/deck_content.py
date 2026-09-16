"""Locked copy for the IFMP Retail client deck.

Every string the deck renders lives here, separated from layout code so the copy
can be reviewed and changed without touching the builder. Slide body text is
香港繁體書面語; speaker notes are Cantonese because they describe spoken
delivery and are never shown on the slide.

Fact sources: `docs/PRODUCT.md`, the approved narrative in
`docs/presentation/2026-09-13-ifmp-retail-cantonese-flow.md`, and the shipped
`/flow` routes in `apps/web/src/App.tsx`.

Boundaries that must not be relaxed: no pricing figures, no dates, no competitor
names, no face recognition, no air-conditioning control claims. Anything not yet
shipped is named only on the roadmap slide and carries no screenshot.
"""

from __future__ import annotations

PRODUCT = "IFMP Retail"
SUBTITLE = "零售營運主控台"
CLIENT = "I.T. 時裝零售"
VENDOR = "HKIT 智域 × 百度一見"
STAMP = "示範畫面 · 樣本資料"
FOOTER = "HKIT 智域 × 百度一見"

# Paths are relative to the repository root.
SHOTS = "docs/presentation/shots"


def shot(name: str) -> str:
    return f"{SHOTS}/{name}"


SLIDES: list[dict] = [
    {
        "kind": "cover",
        "title": PRODUCT,
        "subtitle": SUBTITLE,
        "lines": [
            f"{CLIENT} · 方案介紹",
            STAMP,
            VENDOR,
        ],
        "notes": "開場。說明本日重點為構想與路徑，全程畫面取自示範環境，並非現場即興操作。",
    },
    {
        "kind": "points",
        "title": "本日三項重點",
        "points": [
            (
                "1｜由門口到行動",
                "如何把出入口客流，一路連接到店長當更可用的判斷與調配。",
            ),
            (
                "2｜為何「看得見」不足",
                "只有數據與圖表，並不足以改變現場；平台需要規則、排班與複盤依據。",
            ),
            (
                "3｜為何適合作為試點",
                "感知與營運分層，介面與資料契約可沿用；由一店開始，以真實數據驗證。",
            ),
        ],
        "notes": "今日會見到已上線畫面，以及尚未上線的路線圖，兩者會明確區分。",
    },
    {
        "kind": "table",
        "title": "現場四項痛點",
        "headers": ["痛點", "現場感受"],
        "rows": [
            ["過店多，進店與轉化不穩定", "門口熱鬧，店內業績未必同步"],
            ["高停留區域無人跟進", "試衣間、貨架有人瀏覽，缺口難以及時發現"],
            ["排班與現場脫節", "更表多按經驗；忙閒與實際需要未能對齊"],
            ["複盤欠缺依據", "會議缺乏事件與片段依據，難以建設性檢討"],
        ],
        "col_widths": [11.0, 19.5],
        "notes": "四項痛點係客戶在需求對齊階段提出，不是我們的假設。逐項確認一次。",
    },
    {
        "kind": "table",
        "title": "常見失敗模式",
        "headers": ["市場類型", "限制"],
        "rows": [
            ["純硬件計數", "看得見人流，但行動不了"],
            ["純影像 AI", "片段繁多，缺少營運規則與閉環"],
            ["純排班系統", "有更表，缺少即時現場輸入"],
            ["通用零售 BI 大屏", "視覺完整，但不是店長當更可用的工具"],
        ],
        "col_widths": [10.0, 20.5],
        "closing": "需要的是一套營運系統，而非多一塊顯示屏。",
        "notes": "只用類型對照，不點名任何品牌。強調我們不是再賣一塊屏。",
    },
    {
        "kind": "statement",
        "title": "方案一句話",
        "lines": [
            "以門禁計數掌握出入口事實，以店內攝像掌握動線與停留；",
            "經 一見 完成感知，由 IFMP 形成規則與看板，",
            "並連接 即時調度、排班建議、服務教練。",
            "",
            "能源模組僅在具備設備控制權時再談聯動。",
        ],
        "highlight": "感知與營運是兩層，不是一套大雜燴。",
        "notes": "一句話講完定位。強調感知層與營運層分開，日後換技術或換門店，營運層不用推倒重來。",
    },
    {
        "kind": "flow",
        "title": "架構一頁",
        "steps": [
            ("門禁計數 ／ 店內攝像", "出入口事實與店內動線兩個來源"),
            ("百度一見（感知層）", "偵測、追蹤、區域停留、推送事件"),
            ("IFMP（營運層）", "聚合、規則、看板、告警、複核"),
            ("店長工作流程", "當更判斷、調配、週會複盤"),
        ],
        "closing": "分工原則：一見負責偵測與事件；IFMP 負責營運決策面與閉環。",
        "notes": "強調分層的好處：更換感知技術或更換門店，營運層不需要重做。",
    },
    {
        "kind": "table",
        "title": "刻意不做的事項",
        "headers": ["不做", "原因"],
        "rows": [
            ["不做人臉識別以辨識顧客身份", "隱私敏感，非本方案範圍"],
            ["不提供真實影像回放", "試點以人流與更表推算，並非影像偵測"],
            ["不代寫教練評語", "教練觀察由店長判斷並撰寫"],
            ["不推送通知至員工手機", "員工端應用不在本期範圍"],
            ["不承諾控制商場中央空調", "無設備控制權則不作此主張"],
            ["不一期覆蓋全港門店", "以一店試點驗證為先"],
            ["不在本階段標定報價數字", "範圍未定則價格無意義"],
        ],
        "col_widths": [11.5, 19.0],
        "closing": "承諾與能力一致，比功能清單更重要。",
        "notes": "這頁用來建立信任。主動講清楚我們不做什麼，好過被客戶問到。",
    },
    {
        "kind": "strip",
        "title": "平台導覽",
        "items": [
            (shot("10-entrances.png"), "出入口"),
            (shot("11-journey.png"), "動線熱力"),
            (shot("09-overview.png"), "主控台"),
            (shot("12a-audience.png"), "客群畫像"),
            (shot("12b-compare.png"), "同期對比"),
            (shot("14a-roster-week.png"), "排班"),
        ],
        "closing": "由客流事實，到店長當更判斷，同一套介面完成。",
        "notes": "不逐個畫面講，先建立整體印象，之後才逐頁深入。",
    },
    {
        "kind": "image_right",
        "title": "主控台",
        "image": shot("09-overview.png"),
        "lead": "當更一個入口看清今日狀況。",
        "bullets": [
            "客流關鍵指標集中呈現，無需開啟多套系統",
            "動線熱力縮圖內嵌，一眼看到店內分佈",
            "頁面標示資料定格日，避免誤讀為即時",
        ],
        "notes": "指出這是店長每日開工第一眼看的畫面。",
    },
    {
        "kind": "image_right",
        "title": "出入口",
        "image": shot("10-entrances.png"),
        "lead": "增收由門口開始。",
        "bullets": [
            "區分「路過」與「進店」，兩者不可混為一談",
            "出入口計數對準門口事實，獨立於店內攝像",
            "支援多出入口，並提供近 7 日合計視角",
        ],
        "notes": "強調雙來源敘事：門口用計數，店內用攝像，各司其職。",
    },
    {
        "kind": "image_right",
        "title": "動線熱力",
        "image": shot("11-journey.png"),
        "image_width": 21.5,
        "lead": "何處停留，何處就是轉化機會。",
        "bullets": [
            "平面密度、區域人次與平均停留，指向貨架、試衣間、收銀台",
            "示範平面圖 · 樣本密度（非即時影像）",
            "真實門店更換平面圖並完成標定後，介面與資料契約無需重做",
        ],
        "notes": "說明真實門店更換平面圖並完成標定後，介面與資料契約無需重做。",
    },
    {
        "kind": "image_pair",
        "title": "客群畫像 與 同期對比",
        "pairs": [
            (shot("12a-audience.png"), "客群畫像", "本月至今的顧客結構視角，支援針對性營運判斷。"),
            (shot("12b-compare.png"), "同期對比", "選定日、上週同曜日、去年同期三者並列，判斷今日是否異常。"),
        ],
        "notes": "對比頁是「今日算好定唔好」的答案來源。",
    },
    {
        "kind": "image_pair",
        "title": "節假日 與 設備",
        "pairs": [
            (shot("13a-holidays.png"), "節假日", "港曆節日標籤疊加示例流量，協助區分節日效應與營運問題。"),
            (shot("13b-devices.png"), "設備", "設備清單與最後上線時間，確保資料來源健康、缺口可發現。"),
        ],
        "notes": "節假日標籤用匿名同級店舖示例流量，唔係客戶自身數據。",
    },
    {
        "kind": "roster",
        "title": "排班與管治",
        "main": shot("14a-roster-week.png"),
        "lead": "週更表以週為單位編排，支援複製上週、複製該日、復原操作。",
        "thumbs": [
            (shot("14b-roster-swaps.png"), "調更審批"),
            (shot("14c-roster-audit.png"), "審計記錄"),
        ],
        "governance": "管治配套：員工名冊 ｜ 更表模板 ｜ 工時政策 ｜ 調更審批 ｜ 審計記錄",
        "closing": "調更設審批流程，所有改動留有操作人與動作記錄。",
        "notes": "這頁回應「排班與現場脫節」。重點是排班已經是可操作系統，而不止一張更表。",
    },
    {
        "kind": "image_wide",
        "title": "AI 分析",
        "image": shot("15a-ai-insight.png"),
        "lead": "把圖表讀成一句判斷。",
        "caption": "每個分頁附設分析區，指出異常、比較基準與值得注意的變化，並可重新產生。",
        "notes": "AI 分析已上線。強調它只解讀平台已有的資料，不會寫入或改動任何資料。",
    },
    {
        "kind": "roadmap",
        "title": "已上線 與 路線圖",
        "live_title": "已上線",
        "live": [
            "主控台 ｜ 動線熱力 ｜ 出入口",
            "客群畫像 ｜ 同期對比 ｜ 節假日",
            "設備 ｜ 設定",
            "排班：週板、員工名冊、更表模板、工時政策、調更審批、審計",
            "AI 分析 ｜ 平台問答",
        ],
        "next_title": "開發中",
        "next": [
            "服務缺口偵測：區域人流超出當班人手負荷",
            "一鍵調度：由缺口事件直接指派支援",
            "服務教練：缺口事件帶入週會，由店長撰寫評語",
            "成本與效率：成本模擬、超時預警、排班建議",
            "首輪接觸目標秒數，可配置，預設 90 秒",
        ],
        "later_title": "路線圖",
        "later": [
            "POS 對接 ｜ 多店對標",
            "真實影像回放",
            "能源監測，具備控制權後再談聯動",
        ],
        "closing": "開發中與路線圖項目尚未上線，本頁不提供畫面。",
        "notes": "誠實區分已上線與未上線。這頁係客戶最需要聽清楚的一頁。下一頁會展開開發中那批。",
    },
    {
        "kind": "loop",
        "title": "行動層（開發中）",
        "loop": [
            ("服務缺口偵測", "區域人流超出當班人手負荷，即發出告警。"),
            ("一鍵調度", "由缺口事件直接指派當班同事支援，並記錄結果。"),
            ("週會教練", "缺口事件帶入週會，由店長撰寫觀察與行動項目。"),
        ],
        "loop_note": "三步構成閉環：偵測、處理、複盤。這是「看得見」之後缺的那一半。",
        "efficiency_title": "同時加入效率與成本",
        "efficiency": [
            ("人力成本模擬", "在發佈更表之前，先看清本週人力成本與超時加費。"),
            ("超時預警", "發佈前提示預計超時時數與受影響員工，只作提示，不阻擋發佈。"),
            ("自動排班建議", "依過往需求建議班次，店長可逐項採用或放棄。"),
            ("人手覆蓋提示", "店舖人手少於更表要求時提示，並建議交叉訓練。"),
            ("主控台新增兩個指標", "服務健康度，以及人效配比（每員工小時服務人次）。"),
        ],
        "closing": "試點階段以人流與更表推算，並非影像偵測；本頁不提供畫面。",
        "notes": "呢頁係全場重點：由「睇得到」去「做得到」。強調推算而非影像，係為咗答隱私問題，同時交付門檻較低。",
    },
    {
        "kind": "services",
        "title": "HKIT 實施服務",
        "services": [
            ("現場標定", "攝像位置與區域界線勘定，確保計數與停留判定準確。"),
            ("平台對接", "一見事件接入 IFMP，設定規則閾值與告警條件。"),
            ("平面圖與區域設定", "依真實門店平面圖完成區域定義，介面沿用現有結構。"),
            ("人員識別基礎", "建立工服與排班對照基礎，供人員分類使用。"),
            ("培訓與支援", "店長與營運培訓、週會複盤方法、上線後支援安排。"),
        ],
        "notes": "這頁係交付方價值：不止賣軟件，而是包含落地工作。",
    },
    {
        "kind": "steps",
        "title": "試點如何開始",
        "steps": [
            ("第一步｜選定門店", "選定一店，準備平面圖與現有鏡頭評估。"),
            ("第二步｜訂定規則", "確立服務缺口門檻與店長簽收流程。"),
            ("第三步｜排班對接深度", "先提供建議，或需要寫回既有排班系統，兩者皆可商議。"),
            ("第四步｜換入真實數據", "試點期沿用同一套介面，以真實數據取代樣本資料。"),
        ],
        "closing": "請貴司考慮決定：試點門店與時間窗口、對接窗口（營運與資訊）、是否安排操作工作坊。",
        "notes": "收束為具體決定事項，不留空泛承諾。",
    },
    {
        "kind": "cover",
        "title": "多謝",
        "subtitle": "HKIT 智域 × 百度一見",
        "lines": [
            "下一步：試點門店確認 · 操作工作坊",
            STAMP,
        ],
        "notes": "留時間問答。可就隱私、權限、時程回應。",
    },
]
