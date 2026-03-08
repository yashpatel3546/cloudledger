import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Company, Ledger, Voucher, AccountGroup, StockItem } from '../types';

interface AppState {
  company: Company | null;
  ledgers: Ledger[];
  vouchers: Voucher[];
  stockItems: StockItem[];
  token: string | null;
  isAuthenticated: boolean;
  setCompany: (company: Company) => void;
  addLedger: (ledger: Ledger) => void;
  updateLedger: (id: string, ledger: Partial<Ledger>) => void;
  deleteLedger: (id: string) => void;
  addVoucher: (voucher: Voucher) => void;
  updateVoucher: (id: string, voucher: Partial<Voucher>) => void;
  deleteVoucher: (id: string) => void;
  addStockItem: (item: StockItem) => void;
  updateStockItem: (id: string, item: Partial<StockItem>) => void;
  deleteStockItem: (id: string) => void;
  setToken: (token: string | null) => void;
  login: (token: string, data: any) => void;
  logout: () => void;
  syncWithServer: () => Promise<void>;
  fetchFromServer: () => Promise<void>;
}

const initialLedgers: Ledger[] = [
  { id: '1', name: 'Cash', group: 'Cash-in-Hand', openingBalance: 0, balanceType: 'Dr' },
  { id: '2', name: 'Profit & Loss A/c', group: 'Primary', openingBalance: 0, balanceType: 'Cr' },
];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      company: {
        id: '1',
        name: 'NUMERA Inc.',
        financialYearStart: '2024-04-01',
        booksBeginningFrom: '2024-04-01',
      },
      ledgers: initialLedgers,
      vouchers: [],
      stockItems: [],
      token: null,
      isAuthenticated: false,
      setCompany: (company) => { set({ company }); get().syncWithServer(); },
      addLedger: (ledger) => { set((state) => ({ ledgers: [...state.ledgers, ledger] })); get().syncWithServer(); },
      updateLedger: (id, ledger) => { set((state) => ({
        ledgers: state.ledgers.map((l) => (l.id === id ? { ...l, ...ledger } : l)),
      })); get().syncWithServer(); },
      deleteLedger: (id) => { set((state) => ({
        ledgers: state.ledgers.filter((l) => l.id !== id),
      })); get().syncWithServer(); },
      addVoucher: (voucher) => { set((state) => ({ vouchers: [...state.vouchers, voucher] })); get().syncWithServer(); },
      updateVoucher: (id, voucher) => { set((state) => ({
        vouchers: state.vouchers.map((v) => (v.id === id ? { ...v, ...voucher } : v)),
      })); get().syncWithServer(); },
      deleteVoucher: (id) => { set((state) => ({
        vouchers: state.vouchers.filter((v) => v.id !== id),
      })); get().syncWithServer(); },
      addStockItem: (item) => { set((state) => ({ stockItems: [...state.stockItems, item] })); get().syncWithServer(); },
      updateStockItem: (id, item) => { set((state) => ({
        stockItems: state.stockItems.map((s) => (s.id === id ? { ...s, ...item } : s)),
      })); get().syncWithServer(); },
      deleteStockItem: (id) => { set((state) => ({
        stockItems: state.stockItems.filter((s) => s.id !== id),
      })); get().syncWithServer(); },
      setToken: (token) => set({ token, isAuthenticated: !!token }),
      login: (token, data) => set({ 
        token, 
        isAuthenticated: true,
        company: data.company,
        ledgers: data.ledgers,
        vouchers: data.vouchers,
        stockItems: data.stockItems
      }),
      logout: () => set({ token: null, isAuthenticated: false, company: null, ledgers: [], vouchers: [], stockItems: [] }),
      syncWithServer: async () => {
        const state = get();
        if (!state.token) return;
        try {
          await fetch('/api/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({
              company: state.company,
              ledgers: state.ledgers,
              vouchers: state.vouchers,
              stockItems: state.stockItems
            })
          });
        } catch (err) {
          console.error('Failed to sync with server', err);
        }
      },
      fetchFromServer: async () => {
        const state = get();
        if (!state.token) return;
        try {
          const res = await fetch('/api/sync', {
            headers: {
              'Authorization': `Bearer ${state.token}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            set({
              company: data.company,
              ledgers: data.ledgers,
              vouchers: data.vouchers,
              stockItems: data.stockItems,
              isAuthenticated: true
            });
          } else if (res.status === 401) {
            set({ token: null, isAuthenticated: false });
          }
        } catch (err) {
          console.error('Failed to fetch from server', err);
        }
      }
    }),
    {
      name: 'numera-storage',
      partialize: (state) => ({
        token: state.token,
      }),
    }
  )
);
