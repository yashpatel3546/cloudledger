import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Ledgers } from './pages/Ledgers';
import { Vouchers } from './pages/Vouchers';
import { DayBook } from './pages/DayBook';
import { Reports } from './pages/Reports';
import { Settings as SettingsPage } from './pages/Settings';
import { StockItems } from './pages/StockItems';
import { Auth } from './components/Auth';

export default function App() {
  return (
    <Auth>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="ledgers" element={<Ledgers />} />
            <Route path="inventory" element={<StockItems />} />
            <Route path="vouchers" element={<Vouchers />} />
            <Route path="daybook" element={<DayBook />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </Router>
    </Auth>
  );
}
