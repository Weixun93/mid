-- 旅遊分帳應用資料表結構
-- 在 Supabase SQL Editor 中執行這些 SQL 語句

-- 1. 建立用戶表
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 建立旅遊表
CREATE TABLE IF NOT EXISTS trips (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. 建立景點表
CREATE TABLE IF NOT EXISTS destinations (
  id BIGSERIAL PRIMARY KEY,
  trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  visit_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 建立費用表
CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payer VARCHAR(255) NOT NULL,
  split_with TEXT[] NOT NULL, -- 陣列儲存分帳用戶
  expense_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. 建立分享分帳表
CREATE TABLE IF NOT EXISTS shared_settlements (
  id BIGSERIAL PRIMARY KEY,
  trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  from_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  settlement_data JSONB NOT NULL, -- 儲存分帳資料
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(trip_id, from_user_id, to_user_id) -- 避免重複分享
);

-- 5. 設定權限（關閉 RLS 或設定適當的策略）
-- 方案一：關閉 RLS（開發階段）
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE destinations DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE shared_settlements DISABLE ROW LEVEL SECURITY;

-- 方案二：啟用 RLS 並設定策略（生產環境推薦）
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;  
-- ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can manage their own data" ON users FOR ALL USING (true);
-- CREATE POLICY "Users can manage their trips" ON trips FOR ALL USING (true);
-- CREATE POLICY "Users can manage trip destinations" ON destinations FOR ALL USING (true);
-- CREATE POLICY "Users can manage trip expenses" ON expenses FOR ALL USING (true);

-- 6. 建立索引優化查詢
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_destinations_trip_id ON destinations(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_settlements_trip_id ON shared_settlements(trip_id);
CREATE INDEX IF NOT EXISTS idx_shared_settlements_to_user_id ON shared_settlements(to_user_id);