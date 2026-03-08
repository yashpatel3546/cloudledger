export type VoucherType = 'Receipt' | 'Payment' | 'Sales' | 'Purchase' | 'Contra' | 'Journal';

export type AccountGroup =
  | 'Capital Account'
  | 'Current Assets'
  | 'Current Liabilities'
  | 'Fixed Assets'
  | 'Direct Expenses'
  | 'Indirect Expenses'
  | 'Direct Incomes'
  | 'Indirect Incomes'
  | 'Sundry Debtors'
  | 'Sundry Creditors'
  | 'Cash-in-Hand'
  | 'Bank Accounts'
  | 'Sales Accounts'
  | 'Purchase Accounts'
  | 'Primary';

export interface Ledger {
  id: string;
  name: string;
  group: AccountGroup;
  openingBalance: number;
  balanceType: 'Dr' | 'Cr';
}

export interface VoucherEntry {
  id: string;
  ledgerId: string;
  amount: number;
  type: 'Dr' | 'Cr';
}

export interface InventoryEntry {
  id: string;
  itemId: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Voucher {
  id: string;
  date: string;
  type: VoucherType;
  voucherNumber: string;
  entries: VoucherEntry[];
  inventoryEntries?: InventoryEntry[];
  narration: string;
}

export interface StockItem {
  id: string;
  name: string;
  group: string;
  unit: string;
  openingQuantity: number;
  openingRate: number;
  openingValue: number;
}

export interface Company {
  id: string;
  name: string;
  financialYearStart: string;
  booksBeginningFrom: string;
}
