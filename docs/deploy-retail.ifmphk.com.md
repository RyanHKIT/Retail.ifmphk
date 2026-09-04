# 部署 retail.ifmphk.com（靜態主機）

本示範為 **純前端靜態站**：建置產物在 `apps/web/dist/`，資料來自 repo 根目錄 `public/mock/retail/` 的 JSON。**無需** `.env`、Supabase 或 Express API 即可對外展示。

## 建置（任何 CI 或本機）

```powershell
cd apps\web
npm ci
npm run build
```

- 產出目錄：`apps/web/dist/`
- 入口 URL：**`/retail`**（Overview 總覽）
- Mock 路徑：建置後為 `/mock/retail/*.json`（由 Vite `publicDir` 指向 repo 根 `public/`）

## DNS（僅文件說明；本 repo 不變更正式 DNS）

| 記錄 | 建議 |
|------|------|
| `retail.ifmphk.com` | CNAME 至靜態主機提供的 hostname（Cloudflare Pages / Hostinger 等） |

確認 HTTPS 憑證由主機平台自動簽發。

## SPA  fallback（深層連結）

React Router 使用 **Browser history**；直接開啟或重新整理 `/retail/footfall` 等路徑時，主機須將未知路徑回傳 `index.html`（狀態碼 200），由前端路由接管。

### Cloudflare Pages

1. **Build command：** `cd apps/web && npm ci && npm run build`
2. **Build output directory：** `apps/web/dist`
3. 在 Pages 專案設定啟用 **Single Page Application**（或於 `public/` 放置 `_redirects`：`/* /index.html 200`，需隨建置產物一併部署）

### Hostinger（Apache / `.htaccess`）

將 `dist/` 內容上傳至網站根目錄，並加入：

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

### nginx

```nginx
server {
  listen 443 ssl;
  server_name retail.ifmphk.com;
  root /var/www/ifmp-retail/dist;
  index index.html;

  location /mock/ {
    try_files $uri =404;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

## 環境變數

| 變數 | 示範是否需要 |
|------|----------------|
| （無） | Mock 模式不依賴任何 `VITE_*` 或 API 密鑰 |

請勿在 Pages / 主機後台填入正式 IFMP 或 Supabase 密鑰；示範週維持 mock 即可。

## 部署後 smoke check

1. 開啟 `https://retail.ifmphk.com/retail`
2. 重新整理 `https://retail.ifmphk.com/retail/service-gap`（確認 SPA fallback）
3. DevTools → Network：確認 `/mock/retail/kpi.json` 等回 200

## 簡報腳本

現場講解路徑與重置方式見 [`docs/demo-script.md`](demo-script.md)。
