import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Company, Ledger, Voucher, AccountGroup, StockItem } from '../types';

interface AppState {
  company: Company | null;
  ledgers: Ledger[];
  vouchers: Voucher[];
  stockItems: StockItem[];
  passcodeHash: string | null;
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
  setPasscode: (hash: string) => void;
  login: () => void;
  logout: () => void;
}

const initialLedgers: Ledger[] = [
  { id: '1', name: 'Cash', group: 'Cash-in-Hand', openingBalance: 0, balanceType: 'Dr' },
  { id: '2', name: 'Profit & Loss A/c', group: 'Primary', openingBalance: 0, balanceType: 'Cr' },
];

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      company: {
        id: '1',
        name: 'CloudLedger Inc.',
        financialYearStart: '2024-04-01',
        booksBeginningFrom: '2024-04-01',
      },
      ledgers: initialLedgers,
      vouchers: [],
      stockItems: [],
      passcodeHash: null,
      isAuthenticated: false,
      setCompany: (company) => set({ company }),
      addLedger: (ledger) => set((state) => ({ ledgers: [...state.ledgers, ledger] })),
      updateLedger: (id, ledger) => set((state) => ({
        ledgers: state.ledgers.map((l) => (l.id === id ? { ...l, ...ledger } : l)),
      })),
      deleteLedger: (id) => set((state) => ({
        ledgers: state.ledgers.filter((l) => l.id !== id),
      })),
      addVoucher: (voucher) => set((state) => ({ vouchers: [...state.vouchers, voucher] })),
      updateVoucher: (id, voucher) => set((state) => ({
        vouchers: state.vouchers.map((v) => (v.id === id ? { ...v, ...voucher } : v)),
      })),
      deleteVoucher: (id) => set((state) => ({
        vouchers: state.vouchers.filter((v) => v.id !== id),
      })),
      addStockItem: (item) => set((state) => ({ stockItems: [...state.stockItems, item] })),
      updateStockItem: (id, item) => set((state) => ({
        stockItems: state.stockItems.map((s) => (s.id === id ? { ...s, ...item } : s)),
      })),
      deleteStockItem: (id) => set((state) => ({
        stockItems: state.stockItems.filter((s) => s.id !== id),
      })),
      setPasscode: (hash) => set({ passcodeHash: hash, isAuthenticated: true }),
      login: () => set({ isAuthenticated: true }),
      logout: () => set({ isAuthenticated: false }),
    }),
    {
      name: 'tally-modern-storage',
      partialize: (state) => ({
        company: state.company,
        ledgers: state.ledgers,
        vouchers: state.vouchers,
        stockItems: state.stockItems,
        passcodeHash: state.passcodeHash,
      }),
    }
  )
);
