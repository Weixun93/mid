# 旅遊分帳 Web App

一個簡潔優雅的自助旅遊景點安排與分帳工具，採用 Node.js/Express + Supabase 架構。

## 功能特性

### 👤 用戶認證
- 🔐 安全的用戶登入/註冊系統
- 👥 預設 4 個測試用戶帳戶
- 🛡️ 密碼加密存儲（bcryptjs）
- 🚪 安全的登出功能

### 旅遊管理
- ✈️ 建立和管理多個旅遊計畫
- 📅 記錄旅遊開始和結束日期
- 📝 添加旅遊描述和備註
- 👤 每個用戶的資料完全隔離
- 🔍 點擊旅遊卡片查看詳情

### 景點安排
- 📍 記錄景點名稱、位置和造訪日期
- 💡 添加景點相關的建議和筆記
- 🗺️ 以時間順序整理景點
- ➕ 新增和刪除景點

### 費用分帳
- 💰 記錄旅遊中的所有消費
- 👥 靈活的分帳方式（支持多人分擔）
- 🧮 自動計算誰欠誰多少錢
- 📊 一鍵查看結帳清單
- ➕ 新增和刪除費用記錄

## 技術棧

- **後端**：Node.js + Express 4.18.2
- **前端**：HTML5 + CSS3 + Vanilla JavaScript
- **資料庫**：Supabase (PostgreSQL)
- **認證**：Passport.js + LocalStrategy
- **密碼加密**：bcryptjs
- **會話管理**：express-session + cookie-parser
- **部署**：Render
- **開發工具**：Nodemon (熱重載)

## 設計特色

- 🎨 文青風格淺色系設計
- 📱 完全響應式設計
- ☁️ 雲端資料存儲
- 🌍 支持中文本地化
- 🔒 安全的用戶認證系統

## 快速開始

### 環境設置

```bash
# 安裝依賴
npm install

# 建立 .env 文件（複製 .env.example）
cp .env.example .env
```

**重要：設置環境變數**
編輯 `.env` 文件，填入你的 Supabase 資訊：
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SESSION_SECRET=your-random-secret-key
PORT=8000
```

**建立資料庫表**
在 [Supabase SQL Editor](https://supabase.com/dashboard) 執行：
```sql
-- 用戶表
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 旅遊表
CREATE TABLE IF NOT EXISTS trips (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 景點表
CREATE TABLE IF NOT EXISTS destinations (
  id BIGSERIAL PRIMARY KEY,
  trip_id BIGINT REFERENCES trips(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  visit_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 費用表
CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  trip_id BIGINT REFERENCES trips(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payer VARCHAR(255) NOT NULL,
  split_with TEXT[] NOT NULL,
  expense_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**啟動應用**
```bash
# 開發模式（推薦）
npm run dev

# 生產模式
npm start
```

訪問 `http://localhost:8000` 查看應用。

## 預設測試帳戶

應用啟動時會自動建立以下測試帳戶：
- 用戶名: alice / 密碼: alice123
- 用戶名: bob / 密碼: bob123
- 用戶名: charlie / 密碼: charlie123
- 用戶名: diana / 密碼: diana123

## 檔案結構

```
trip-splitter/
├── server.js                # Express 應用入口
├── public/
│   ├── index.html          # 首頁
│   ├── login.html          # 登入頁
│   ├── trip_detail.html    # 旅遊詳情頁
│   ├── css/
│   │   └── style.css       # 樣式表
│   └── js/
│       ├── auth.js         # 認證 JavaScript
│       ├── main.js         # 首頁 JavaScript
│       └── trip_detail.js  # 旅遊詳情頁 JavaScript
├── .env                    # 環境變數（本地）
├── .env.example            # 環境變數示例
├── package.json            # 依賴配置
├── Procfile                # Render 部署配置
├── database.sql            # 資料庫建表 SQL
└── README.md               # 此檔案
```

## 故障排除

### 登入顯示「網路錯誤，請稍後再試」

**原因 1：資料庫表不存在**
```bash
# 檢查 Supabase 控制台是否建立了 users 表
# 在 SQL Editor 執行上述 SQL 語句
```

**原因 2：環境變數配置錯誤**
```bash
# 檢查 .env 文件是否正確配置
cat .env

# 確認 SUPABASE_URL 和 SUPABASE_KEY 正確
# 重新生成 SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**原因 3：伺服器未正確啟動**
```bash
# 檢查端口是否被佔用
lsof -ti :8000

# 終止佔用的進程
kill $(lsof -ti :8000)

# 重新啟動
npm run dev
```

**原因 4：CORS 或會話問題**
- 確認瀏覽器不在 incognito 模式
- 清除瀏覽器 cookies
- 檢查 F12 控制台的詳細錯誤

### 端口被佔用錯誤
```bash
# 查找佔用端口的進程
lsof -i :8000

# 終止進程（替換 PID）
kill -9 <PID>

# 或使用不同端口
PORT=3000 npm run dev
```

### 點擊旅遊卡片顯示 "Cannot GET /trip"

**原因：缺少旅遊詳情頁面路由**
```bash
# 檢查 server.js 中是否有 /trip 路由
grep -n "/trip" server.js

# 如果沒有，確保已添加：
app.get('/trip', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'trip_detail.html'));
});
```

**原因：缺少旅遊詳情頁面檔案**
```bash
# 檢查 public/ 目錄下是否有 trip_detail.html 和 trip_detail.js
ls -la public/
```

### 新增景點或費用失敗

**原因：資料庫表不存在**
```bash
# 確保已在 Supabase 建立 destinations 和 expenses 表
# 參考 database.sql 中的建表語句
```

**原因：權限設定問題**
```bash
# 在 Supabase 中檢查 RLS 設定
# 或者在 SQL Editor 執行：
ALTER TABLE destinations DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
```

## 部署到 Render

### 步驟

1. **準備 GitHub 倉庫**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **連接 Render**
   - 訪問 [Render Dashboard](https://dashboard.render.com)
   - 點擊 "New +"
   - 選擇 "Web Service"
   - 連接你的 GitHub 倉庫

3. **配置部署**
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Add Environment Variables:
     - `SUPABASE_URL` = 你的 Supabase URL
     - `SUPABASE_KEY` = 你的 Supabase anon key
     - `SESSION_SECRET` = 安全的隨機字符串

4. **部署**
   - 點擊 "Deploy"
   - 等待部署完成

## API 端點

### 認證
- `POST /auth/login` - 用戶登入
- `POST /auth/register` - 用戶註冊
- `POST /auth/logout` - 用戶登出
- `GET /auth/user` - 獲取當前用戶信息

### 旅遊管理
- `GET /api/trips` - 獲取所有旅遊
- `POST /api/trips` - 建立新旅遊
- `GET /api/trips/:trip_id` - 獲取特定旅遊
- `PUT /api/trips/:trip_id` - 更新旅遊
- `DELETE /api/trips/:trip_id` - 刪除旅遊

### 景點管理
- `GET /api/trips/:trip_id/destinations` - 獲取旅遊景點
- `POST /api/trips/:trip_id/destinations` - 新增景點
- `DELETE /api/trips/:trip_id/destinations/:destination_id` - 移除景點

### 費用管理
- `POST /api/expenses` - 新增費用
- `GET /api/trips/:trip_id/expenses` - 獲取旅遊費用
- `DELETE /api/expenses/:expense_id` - 刪除費用
- `GET /api/trips/:trip_id/settlement` - 計算結帳

## 使用示例

### 登入
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "password": "alice123"
  }'
```

### 建立旅遊
```bash
curl -X POST http://localhost:8000/api/trips \
  -H "Content-Type: application/json" \
  -d '{
    "name": "日本京都之旅",
    "start_date": "2024-03-01",
    "end_date": "2024-03-07",
    "description": "與朋友一起去京都遊玩"
  }'
```

### 記錄費用
```bash
curl -X POST http://localhost:8000/api/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "trip_id": "123",
    "description": "飯店住宿",
    "amount": 5000,
    "payer": "alice",
    "split_with": ["alice", "bob", "charlie"]
  }'
```

## 常見問題

**Q: 資料會永久保存嗎？**
A: 資料存儲在 Supabase PostgreSQL 資料庫中，具有完整的持久化和備份支持。

**Q: 支持多少用戶同時使用？**
A: 取決於你的 Supabase 計劃。免費計劃支持足夠的並發用戶。

**Q: 可以匯出數據嗎？**
A: 可以通過 Supabase 控制台直接匯出資料或使用 API 獲取資料。

**Q: 如何重置資料庫？**
A: 在 Supabase 控制台刪除表格，然後重新執行建表 SQL。

**Q: 可以更改端口嗎？**
A: 是的，在 `.env` 文件中設置 `PORT=你的端口號`。

## 貢獻

歡迎提交 Issue 和 Pull Request！

## 授權

MIT License
