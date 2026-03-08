# CloudLedger: Simple Cloud Accounting System

Welcome to **CloudLedger**, a lightweight, server-based personal accounting system designed for non-programmers. This guide explains the system architecture, database design, API structure, and how to deploy it easily.

---

## 1. System Architecture Diagram

This architecture is designed to be simple, free (or very low-cost), and easy to maintain.

```text
[ User (You) ]
      |
      | (Internet / Mobile / Desktop)
      v
[ Frontend (React + Vite) ]  <--- Hosted on Vercel (Free)
      |
      | (API Calls / Secure Connection)
      v
[ Backend & Database (Supabase) ] <--- Hosted on Supabase (Free)
      |
      +-- PostgreSQL Database (Stores all your data)
      +-- Authentication (Login system)
      +-- Auto-generated APIs
```

**Why this stack?**
* **Frontend (React/Vite):** Fast, modern, and mobile-friendly.
* **Backend (Supabase):** It provides a database, authentication, and APIs all in one place. You don't need to write complex backend code.
* **Hosting (Vercel):** The easiest way to host a website for free. It automatically updates when you change your code.

---

## 2. Database Schema (Structure)

We will use a relational database (PostgreSQL via Supabase). Here are the tables you need:

### Table 1: `users`
Stores your login information. (Handled automatically by Supabase Auth).
* `id` (UUID) - Unique identifier.
* `email` (Text) - Your email address.

### Table 2: `categories`
Used to group your transactions (e.g., Salary, Groceries, Rent, Initial Investment).
* `id` (UUID) - Unique identifier.
* `name` (Text) - Name of the category (e.g., "Food").
* `type` (Text) - Either `INCOME`, `EXPENSE`, or `CAPITAL`.

### Table 3: `ledgers` (Accounts)
Represents different accounts or "buckets" of money (e.g., Cash, Bank Account, Credit Card).
* `id` (UUID) - Unique identifier.
* `name` (Text) - Name of the ledger (e.g., "Main Bank Account").
* `opening_balance` (Decimal) - Starting amount.
* `balance_type` (Text) - `Dr` (Debit/Asset) or `Cr` (Credit/Liability).

### Table 4: `transactions` (Vouchers)
The core table where every movement of money is recorded.
* `id` (UUID) - Unique identifier.
* `date` (Date) - When the transaction happened.
* `type` (Text) - `RECEIPT` (Income/Capital), `PAYMENT` (Expense), `CONTRA` (Bank to Cash).
* `amount` (Decimal) - The total amount.
* `description` (Text) - Notes about the transaction.
* `category_id` (UUID) - Links to the `categories` table.
* `ledger_id` (UUID) - Links to the `ledgers` table (which account was used).

---

## 3. API Structure

Since we are using **Supabase**, the APIs are automatically generated for you! You interact with the database using a simple JavaScript library.

Here is how the API logic works in the app:

* **Add a Transaction (Income/Expense/Capital):**
  ```javascript
  // Example API Call to Supabase
  const { data, error } = await supabase
    .from('transactions')
    .insert([
      { date: '2023-10-25', type: 'PAYMENT', amount: 50.00, description: 'Groceries', category_id: '...', ledger_id: '...' }
    ])
  ```

* **Fetch Reports (e.g., Total Expenses this month):**
  ```javascript
  // Example API Call to Supabase
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'PAYMENT')
    .gte('date', '2023-10-01') // Greater than or equal to start of month
  ```

* **Update a Record:**
  ```javascript
  const { data, error } = await supabase
    .from('transactions')
    .update({ amount: 55.00 })
    .eq('id', 'transaction_id_here')
  ```

---

## 4. Frontend UI Layout

The user interface is designed to be clean and mobile-friendly.

1. **Dashboard (Home):**
   * **Top Cards:** Total Income, Total Expenses, Cash Balance, Active Ledgers.
   * **Charts:** A bar chart showing Income vs. Expenses over the last 6 months.
   * **Recent Activity:** A quick list of the last 5 transactions.

2. **Vouchers (Add Transactions):**
   * A simple form to record money coming in (Receipt) or going out (Payment).
   * Fields: Date, Type (Income/Expense), Amount, Category, Account (Ledger), and Description.

3. **Ledgers (Accounts):**
   * A page to manage your bank accounts, cash, and capital accounts.
   * Shows the current balance of each.

4. **Reports & DayBook:**
   * **DayBook:** A chronological list of all transactions (like a bank statement).
   * **Reports:** Profit & Loss summary (Total Income minus Total Expenses).

---

## 5. Security

* **User Authentication:** Supabase provides secure email/password login. Only you can access your data.
* **Data Privacy:** Supabase uses Row Level Security (RLS). We configure it so that a user can only read and write data that belongs to their specific `user_id`.
* **Backup:** Supabase automatically backs up your database daily on their paid plans, but on the free plan, you can easily export your data as a CSV file anytime from their dashboard.

---

## 6. Step-by-Step Setup Guide (For Beginners)

Here is how you can deploy this system yourself for free.

### Step 1: Set up the Database (Supabase)
1. Go to [Supabase.com](https://supabase.com/) and create a free account.
2. Click **"New Project"**, give it a name (e.g., "CloudLedger"), and create a secure password.
3. Wait a few minutes for the database to be set up.
4. Go to the **"Project Settings" -> "API"** section. You will need the **Project URL** and **anon public key** later.
5. Go to the **"SQL Editor"** in Supabase and paste the database schema (which creates the tables).

### Step 2: Get the Code
1. You can download the code for this app (the one currently running in this preview).
2. Create a free account on [GitHub.com](https://github.com/).
3. Upload the code to a new GitHub repository.

### Step 3: Connect Code to Database
1. In your code, create a file named `.env.local`.
2. Add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_project_url_here
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

### Step 4: Host the Website (Vercel)
1. Go to [Vercel.com](https://vercel.com/) and sign up using your GitHub account.
2. Click **"Add New..." -> "Project"**.
3. Select the GitHub repository you created in Step 2.
4. In the **"Environment Variables"** section on Vercel, add the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` just like you did in Step 3.
5. Click **"Deploy"**.

**Congratulations!** In about 2 minutes, Vercel will give you a live URL (e.g., `https://cloudledger.vercel.app`). You can open this link on your phone or computer anywhere in the world, log in, and start managing your finances!
