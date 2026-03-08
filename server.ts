import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production';

app.use(express.json());
app.use(cookieParser());
app.use(cors());

// Initialize Database
const db = new Database('database.sqlite');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    financial_year_start TEXT NOT NULL,
    books_beginning_from TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS ledgers (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    opening_balance REAL NOT NULL,
    balance_type TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies (id)
  );

  CREATE TABLE IF NOT EXISTS vouchers (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    voucher_number TEXT NOT NULL,
    narration TEXT,
    FOREIGN KEY (company_id) REFERENCES companies (id)
  );

  CREATE TABLE IF NOT EXISTS voucher_entries (
    id TEXT PRIMARY KEY,
    voucher_id TEXT NOT NULL,
    ledger_id TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    FOREIGN KEY (voucher_id) REFERENCES vouchers (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS stock_items (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    unit TEXT NOT NULL,
    opening_quantity REAL NOT NULL,
    opening_rate REAL NOT NULL,
    opening_value REAL NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies (id)
  );

  CREATE TABLE IF NOT EXISTS inventory_entries (
    id TEXT PRIMARY KEY,
    voucher_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    quantity REAL NOT NULL,
    rate REAL NOT NULL,
    amount REAL NOT NULL,
    FOREIGN KEY (voucher_id) REFERENCES vouchers (id) ON DELETE CASCADE
  );
`);

// Authentication Middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// --- API Routes ---

// Auth
app.post('/api/auth/register', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const passwordHash = bcrypt.hashSync(password, 10);
    const userId = uuidv4();
    
    const stmt = db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)');
    stmt.run(userId, email, passwordHash);

    // Create default company for new user
    const companyId = uuidv4();
    db.prepare('INSERT INTO companies (id, user_id, name, financial_year_start, books_beginning_from) VALUES (?, ?, ?, ?, ?)')
      .run(companyId, userId, 'My Company', '2024-04-01', '2024-04-01');

    // Create default ledgers
    db.prepare('INSERT INTO ledgers (id, company_id, name, group_name, opening_balance, balance_type) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), companyId, 'Cash', 'Cash-in-Hand', 0, 'Dr');
    db.prepare('INSERT INTO ledgers (id, company_id, name, group_name, opening_balance, balance_type) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), companyId, 'Profit & Loss A/c', 'Primary', 0, 'Cr');

    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    res.json({ token, user: { id: userId, email } });
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
  res.json({ token, user: { id: user.id, email: user.email } });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

app.get('/api/auth/me', authenticate, (req: any, res) => {
  const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// Sync Data
app.get('/api/sync', authenticate, (req: any, res) => {
  const company = db.prepare('SELECT * FROM companies WHERE user_id = ?').get(req.userId) as any;
  if (!company) return res.status(404).json({ error: 'Company not found' });

  const ledgers = db.prepare('SELECT id, name, group_name as "group", opening_balance as openingBalance, balance_type as balanceType FROM ledgers WHERE company_id = ?').all(company.id);
  const stockItems = db.prepare('SELECT id, name, group_name as "group", unit, opening_quantity as openingQuantity, opening_rate as openingRate, opening_value as openingValue FROM stock_items WHERE company_id = ?').all(company.id);
  
  const vouchersRaw = db.prepare('SELECT id, date, type, voucher_number as voucherNumber, narration FROM vouchers WHERE company_id = ?').all(company.id) as any[];
  
  const vouchers = vouchersRaw.map(v => {
    const entries = db.prepare('SELECT id, ledger_id as ledgerId, amount, type FROM voucher_entries WHERE voucher_id = ?').all(v.id);
    const inventoryEntries = db.prepare('SELECT id, item_id as itemId, quantity, rate, amount FROM inventory_entries WHERE voucher_id = ?').all(v.id);
    return { ...v, entries, inventoryEntries };
  });

  res.json({
    company: {
      id: company.id,
      name: company.name,
      financialYearStart: company.financial_year_start,
      booksBeginningFrom: company.books_beginning_from
    },
    ledgers,
    vouchers,
    stockItems
  });
});

app.post('/api/sync', authenticate, (req: any, res) => {
  const { company, ledgers, vouchers, stockItems } = req.body;
  
  const dbCompany = db.prepare('SELECT id FROM companies WHERE user_id = ?').get(req.userId) as any;
  if (!dbCompany) return res.status(404).json({ error: 'Company not found' });
  const companyId = dbCompany.id;

  const runInTransaction = db.transaction(() => {
    // Update company
    if (company) {
      db.prepare('UPDATE companies SET name = ?, financial_year_start = ?, books_beginning_from = ? WHERE id = ?')
        .run(company.name, company.financialYearStart, company.booksBeginningFrom, companyId);
    }

    // Sync ledgers
    if (ledgers) {
      db.prepare('DELETE FROM ledgers WHERE company_id = ?').run(companyId);
      const insertLedger = db.prepare('INSERT INTO ledgers (id, company_id, name, group_name, opening_balance, balance_type) VALUES (?, ?, ?, ?, ?, ?)');
      for (const l of ledgers) {
        insertLedger.run(l.id, companyId, l.name, l.group, l.openingBalance, l.balanceType);
      }
    }

    // Sync stock items
    if (stockItems) {
      db.prepare('DELETE FROM stock_items WHERE company_id = ?').run(companyId);
      const insertStock = db.prepare('INSERT INTO stock_items (id, company_id, name, group_name, unit, opening_quantity, opening_rate, opening_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      for (const s of stockItems) {
        insertStock.run(s.id, companyId, s.name, s.group, s.unit, s.openingQuantity, s.openingRate, s.openingValue);
      }
    }

    // Sync vouchers
    if (vouchers) {
      db.prepare('DELETE FROM vouchers WHERE company_id = ?').run(companyId);
      const insertVoucher = db.prepare('INSERT INTO vouchers (id, company_id, date, type, voucher_number, narration) VALUES (?, ?, ?, ?, ?, ?)');
      const insertVEntry = db.prepare('INSERT INTO voucher_entries (id, voucher_id, ledger_id, amount, type) VALUES (?, ?, ?, ?, ?)');
      const insertIEntry = db.prepare('INSERT INTO inventory_entries (id, voucher_id, item_id, quantity, rate, amount) VALUES (?, ?, ?, ?, ?, ?)');
      
      for (const v of vouchers) {
        insertVoucher.run(v.id, companyId, v.date, v.type, v.voucherNumber, v.narration || '');
        for (const e of v.entries) {
          insertVEntry.run(e.id, v.id, e.ledgerId, e.amount, e.type);
        }
        if (v.inventoryEntries) {
          for (const ie of v.inventoryEntries) {
            insertIEntry.run(ie.id, v.id, ie.itemId, ie.quantity, ie.rate, ie.amount);
          }
        }
      }
    }
  });

  try {
    runInTransaction();
    res.json({ success: true });
  } catch (err: any) {
    console.error('Sync error:', err);
    res.status(500).json({ error: 'Failed to sync data' });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
