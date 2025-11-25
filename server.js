import express from 'express';
import session from 'express-session';
import passport from 'passport';
import LocalStrategy from 'passport-local';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8000;

// ==================== Supabase 初始化 ====================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ==================== 中間件配置 ====================
app.set('trust proxy', 1); // 信任代理（用於 Render 等平台）
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static('public'));

// 會話配置
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // 在 Render 上設置為 false，因為它處理 HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 小時
  }
}));

// Passport 配置
app.use(passport.initialize());
app.use(passport.session());

// ==================== Passport 策略 ====================
passport.use(new LocalStrategy(
  {
    usernameField: 'username',
    passwordField: 'password'
  },
  async (username, password, done) => {
    try {
      console.log(`🔍 登入嘗試: ${username}`);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      console.log('Supabase 查詢結果:', { data, error });

      if (error) {
        console.log('Supabase 錯誤:', error);
        return done(null, false, { message: '資料庫查詢失敗' });
      }

      if (!data) {
        console.log('用戶不存在:', username);
        return done(null, false, { message: '用戶不存在' });
      }

      const passwordMatch = await bcrypt.compare(password, data.password_hash);
      console.log('密碼比對結果:', passwordMatch);
      
      if (!passwordMatch) {
        return done(null, false, { message: '密碼錯誤' });
      }

      console.log('✅ 登入成功:', username);
      return done(null, data);
    } catch (err) {
      console.error('登入錯誤:', err);
      return done(err);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return done(null, false);
    }

    done(null, data);
  } catch (err) {
    done(err);
  }
});

// ==================== 認證中間件 ====================
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: '請先登入' });
};

// ==================== 初始化預設用戶 ====================
async function initializeDefaultUsers() {
  try {
    console.log('🔄 開始初始化預設用戶...');

    const defaultUsers = [
      { username: 'alice', password: 'alice123' },
      { username: 'bob', password: 'bob123' },
      { username: 'charlie', password: 'charlie123' },
      { username: 'diana', password: 'diana123' }
    ];

    for (const user of defaultUsers) {
      // 檢查用戶是否已存在
      const { data: existing } = await supabase
        .from('users')
        .select('username')
        .eq('username', user.username)
        .single();

      if (!existing) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        const { error: insertError } = await supabase.from('users').insert({
          username: user.username,
          password_hash: hashedPassword,
          created_at: new Date().toISOString()
        });

        if (insertError) {
          console.error(`❌ 建立用戶 ${user.username} 失敗:`, insertError.message);
        } else {
          console.log(`✓ 建立預設用戶: ${user.username}`);
        }
      } else {
        console.log(`✓ 用戶 ${user.username} 已存在`);
      }
    }

    console.log('✓ 預設用戶初始化完成');
  } catch (err) {
    console.error('❌ 初始化預設用戶失敗:', err.message);
  }
}

// ==================== 檢查資料庫連接 ====================
async function checkDatabaseConnection() {
  try {
    console.log('🔍 檢查資料庫連接...');

    // 測試基本查詢
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.error('❌ 資料庫連接失敗:', error.message);
      return false;
    }

    console.log('✅ 資料庫連接正常');
    return true;
  } catch (err) {
    console.error('❌ 資料庫連接檢查失敗:', err.message);
    return false;
  }
}

// ==================== 認證路由 ====================
app.post('/auth/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).json({ error: '伺服器錯誤' });
    }

    if (!user) {
      return res.status(401).json({ error: info.message || '登入失敗' });
    }

    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).json({ error: '登入失敗' });
      }

      res.json({
        message: '登入成功',
        user: {
          id: user.id,
          username: user.username
        }
      });
    });
  })(req, res, next);
});

app.post('/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('📝 註冊嘗試:', { username });

    if (!username || !password) {
      return res.status(400).json({ error: '請提供用戶名和密碼' });
    }

    // 檢查用戶名是否已存在
    const { data: existing, error: checkError } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .single();

    console.log('用戶檢查結果:', { existing, checkError });

    if (existing) {
      return res.status(400).json({ error: '用戶名已存在' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('密碼已加密');

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        username,
        password_hash: hashedPassword,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    console.log('插入結果:', { newUser, error });

    if (error) {
      console.error('註冊 Supabase 錯誤:', error);
      return res.status(400).json({ error: '註冊失敗: ' + error.message });
    }

    res.json({ message: '註冊成功', user: { username } });
  } catch (err) {
    console.error('註冊系統錯誤:', err);
    res.status(500).json({ error: '伺服器錯誤: ' + err.message });
  }
});

app.post('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: '登出失敗' });
    }
    res.json({ message: '登出成功' });
  });
});

app.get('/auth/user', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username
    }
  });
});

// ==================== 旅遊路由 ====================
app.get('/api/trips', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/trips', requireAuth, async (req, res) => {
  try {
    const { name, start_date, end_date, description } = req.body;

    const { data, error } = await supabase
      .from('trips')
      .insert({
        user_id: req.user.id,
        name,
        start_date,
        end_date,
        description: description || '',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/trips/:trip_id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', req.params.trip_id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: '找不到該旅遊' });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/trips/:trip_id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('trips')
      .update(req.body)
      .eq('id', req.params.trip_id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/trips/:trip_id', requireAuth, async (req, res) => {
  try {
    // 刪除相關費用
    await supabase
      .from('expenses')
      .delete()
      .eq('trip_id', req.params.trip_id)
      .eq('user_id', req.user.id);

    // 刪除旅遊
    await supabase
      .from('trips')
      .delete()
      .eq('id', req.params.trip_id)
      .eq('user_id', req.user.id);

    res.json({ message: '已刪除旅遊' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== 景點路由 ====================
app.get('/api/trips/:trip_id/destinations', requireAuth, async (req, res) => {
  try {
    console.log('📍 獲取景點請求:', {
      trip_id: req.params.trip_id,
      user: req.user.id
    });

    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .eq('trip_id', req.params.trip_id)
      .order('visit_date', { ascending: true });

    console.log('📍 景點查詢結果:', { data: data?.length || 0, error });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('獲取景點錯誤:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/trips/:trip_id/destinations', requireAuth, async (req, res) => {
  try {
    console.log('📍 新增景點請求:', {
      trip_id: req.params.trip_id,
      body: req.body,
      user: req.user.id
    });

    const { name, location, visit_date, notes } = req.body;

    if (!name) {
      return res.status(400).json({ error: '景點名稱是必需的' });
    }

    const { data, error } = await supabase
      .from('destinations')
      .insert({
        trip_id: parseInt(req.params.trip_id),
        name,
        location,
        visit_date,
        notes: notes || ''
      })
      .select()
      .single();

    console.log('Supabase 插入結果:', { data, error });

    if (error) {
      console.error('Supabase 錯誤:', error);
      throw error;
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('新增景點錯誤:', err);
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/trips/:trip_id/destinations/:destination_id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('destinations')
      .delete()
      .eq('id', req.params.destination_id)
      .eq('trip_id', req.params.trip_id);

    if (error) throw error;
    res.json({ message: '已刪除景點' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== 費用路由 ====================
app.post('/api/expenses', requireAuth, async (req, res) => {
  try {
    const { trip_id, description, amount, payer, split_with } = req.body;

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        user_id: req.user.id,
        trip_id,
        description,
        amount: parseFloat(amount),
        payer,
        split_with: split_with || [],
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/trips/:trip_id/expenses', requireAuth, async (req, res) => {
  try {
    console.log('💰 獲取費用請求:', {
      trip_id: req.params.trip_id,
      user: req.user.id
    });

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', req.params.trip_id)
      .eq('user_id', req.user.id);

    console.log('💰 費用查詢結果:', { data: data?.length || 0, error });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('獲取費用錯誤:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/expenses/:expense_id', requireAuth, async (req, res) => {
  try {
    await supabase
      .from('expenses')
      .delete()
      .eq('id', req.params.expense_id)
      .eq('user_id', req.user.id);

    res.json({ message: '已刪除費用' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/trips/:trip_id/settlement', requireAuth, async (req, res) => {
  try {
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', req.params.trip_id)
      .eq('user_id', req.user.id);

    if (error) throw error;

    const balances = {};

    (expenses || []).forEach(expense => {
      const payer = expense.payer;
      const amount = expense.amount;
      const splitWith = expense.split_with || [];
      const totalPeople = splitWith.length + 1; // 包括付款人

      if (!balances[payer]) balances[payer] = 0;
      balances[payer] += amount - (amount / totalPeople);

      splitWith.forEach(person => {
        if (!balances[person]) balances[person] = 0;
        balances[person] -= amount / totalPeople;
      });
    });

    res.json(balances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== 分享路由 ====================
app.post('/api/trips/:trip_id/share', requireAuth, async (req, res) => {
  try {
    const { target_username, message } = req.body;

    if (!target_username) {
      return res.status(400).json({ error: '請提供目標用戶名稱' });
    }

    // 檢查目標用戶是否存在
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', target_username)
      .single();

    if (userError || !targetUser) {
      return res.status(404).json({ error: '找不到該用戶' });
    }

    // 檢查是否已經分享過
    const { data: existingShare } = await supabase
      .from('shared_settlements')
      .select('id')
      .eq('trip_id', parseInt(req.params.trip_id))
      .eq('from_user_id', req.user.id)
      .eq('to_user_id', targetUser.id)
      .single();

    if (existingShare) {
      return res.status(400).json({ error: '已經分享給該用戶了' });
    }

    // 獲取分帳資料
    const { data: expenses, error: expenseError } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', req.params.trip_id)
      .eq('user_id', req.user.id);

    if (expenseError) throw expenseError;

    const balances = {};
    (expenses || []).forEach(expense => {
      const payer = expense.payer;
      const amount = expense.amount;
      const splitWith = expense.split_with || [];
      const totalPeople = splitWith.length + 1; // 包括付款人

      if (!balances[payer]) balances[payer] = 0;
      balances[payer] += amount - (amount / totalPeople);

      splitWith.forEach(person => {
        if (!balances[person]) balances[person] = 0;
        balances[person] -= amount / totalPeople;
      });
    });

    // 儲存分享
    const { error: shareError } = await supabase
      .from('shared_settlements')
      .insert({
        trip_id: parseInt(req.params.trip_id),
        from_user_id: req.user.id,
        to_user_id: targetUser.id,
        settlement_data: balances,
        message: message || ''
      });

    if (shareError) throw shareError;

    res.json({ message: '分帳已分享成功' });
  } catch (err) {
    console.error('分享分帳錯誤:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/shared-settlements', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('shared_settlements')
      .select(`
        id,
        settlement_data,
        message,
        created_at,
        trips!inner(name),
        users!shared_settlements_from_user_id_fkey(username)
      `)
      .eq('to_user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== 資料庫初始化路由 ====================
app.post('/api/init-database', async (req, res) => {
  try {
    console.log('🔧 開始初始化資料庫...');

    // 檢查資料庫連接
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      return res.status(500).json({ error: '無法連接到資料庫' });
    }

    // 初始化預設用戶
    await initializeDefaultUsers();

    res.json({
      message: '資料庫初始化完成',
      users: ['alice', 'bob', 'charlie', 'diana']
    });
  } catch (err) {
    console.error('資料庫初始化失敗:', err);
    res.status(500).json({ error: '資料庫初始化失敗: ' + err.message });
  }
});

app.get('/trip', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'trip_detail.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ==================== 啟動服務器 ====================
async function startServer() {
  try {
    console.log('🚀 啟動旅遊分帳應用程式...');

    // 檢查資料庫連接
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      console.error('❌ 無法連接到資料庫，應用程式無法啟動');
      process.exit(1);
    }

    // 初始化預設用戶
    await initializeDefaultUsers();

    app.listen(PORT, () => {
      console.log(`\n✨ 旅遊分帳應用運行在 http://localhost:${PORT}\n`);
      console.log('📋 預設用戶: alice/alice123, bob/bob123, charlie/charlie123, diana/diana123');
    });
  } catch (err) {
    console.error('❌ 啟動服務器失敗:', err);
    process.exit(1);
  }
}

startServer();