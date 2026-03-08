import React, { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';

export function Reports() {
  const { ledgers, vouchers, stockItems } = useStore();
  const [reportType, setReportType] = useState<'tb' | 'pl' | 'bs' | 'stock'>('tb');

  const balances = useMemo(() => {
    const bal: Record<string, { name: string, group: string, dr: number, cr: number }> = {};
    ledgers.forEach(l => {
      bal[l.id] = {
        name: l.name,
        group: l.group,
        dr: l.balanceType === 'Dr' ? l.openingBalance : 0,
        cr: l.balanceType === 'Cr' ? l.openingBalance : 0,
      };
    });
    vouchers.forEach(v => {
      v.entries.forEach(e => {
        if (bal[e.ledgerId]) {
          if (e.type === 'Dr') bal[e.ledgerId].dr += e.amount;
          if (e.type === 'Cr') bal[e.ledgerId].cr += e.amount;
        }
      });
    });
    return Object.values(bal).map(b => {
      const net = b.dr - b.cr;
      return {
        ...b,
        netDr: net > 0 ? net : 0,
        netCr: net < 0 ? Math.abs(net) : 0,
      };
    });
  }, [ledgers, vouchers]);

  const trialBalance = useMemo(() => {
    const entries = balances.filter(b => b.netDr > 0 || b.netCr > 0);
    const totals = entries.reduce((acc, b) => {
      acc.dr += b.netDr;
      acc.cr += b.netCr;
      return acc;
    }, { dr: 0, cr: 0 });
    return { entries, totals };
  }, [balances]);

  const stockSummary = useMemo(() => {
    const summary: Record<string, { name: string, group: string, unit: string, qty: number, value: number }> = {};
    
    stockItems.forEach(item => {
      summary[item.id] = {
        name: item.name,
        group: item.group,
        unit: item.unit,
        qty: item.openingQuantity,
        value: item.openingValue
      };
    });

    vouchers.forEach(v => {
      if (v.inventoryEntries) {
        v.inventoryEntries.forEach(ie => {
          if (summary[ie.itemId]) {
            if (v.type === 'Purchase') {
              summary[ie.itemId].qty += ie.quantity;
              summary[ie.itemId].value += ie.amount;
            } else if (v.type === 'Sales') {
              summary[ie.itemId].qty -= ie.quantity;
              const avgCost = summary[ie.itemId].qty > 0 ? summary[ie.itemId].value / (summary[ie.itemId].qty + ie.quantity) : 0;
              summary[ie.itemId].value -= (ie.quantity * avgCost);
            }
          }
        });
      }
    });

    return Object.values(summary);
  }, [stockItems, vouchers]);

  const profitAndLoss = useMemo(() => {
    const directIncomes = balances.filter(b => ['Sales Accounts', 'Direct Incomes'].includes(b.group));
    const directExpenses = balances.filter(b => ['Purchase Accounts', 'Direct Expenses'].includes(b.group));
    
    let totalDirectIncome = directIncomes.reduce((sum, b) => sum + b.netCr - b.netDr, 0);
    let totalDirectExpense = directExpenses.reduce((sum, b) => sum + b.netDr - b.netCr, 0);

    // Opening Stock
    const openingStockValue = stockItems.reduce((sum, item) => sum + item.openingValue, 0);
    if (openingStockValue > 0) {
      directExpenses.push({ name: 'Opening Stock', group: 'Stock', dr: openingStockValue, cr: 0, netDr: openingStockValue, netCr: 0 });
      totalDirectExpense += openingStockValue;
    }

    // Closing Stock
    const closingStockValue = stockSummary.reduce((sum, item) => sum + item.value, 0);
    if (closingStockValue > 0) {
      directIncomes.push({ name: 'Closing Stock', group: 'Stock', dr: 0, cr: closingStockValue, netDr: 0, netCr: closingStockValue });
      totalDirectIncome += closingStockValue;
    }

    const grossProfit = totalDirectIncome - totalDirectExpense;

    const indirectIncomes = balances.filter(b => b.group === 'Indirect Incomes');
    const indirectExpenses = balances.filter(b => b.group === 'Indirect Expenses');

    const totalIndirectIncome = indirectIncomes.reduce((sum, b) => sum + b.netCr - b.netDr, 0) + (grossProfit > 0 ? grossProfit : 0);
    const totalIndirectExpense = indirectExpenses.reduce((sum, b) => sum + b.netDr - b.netCr, 0) + (grossProfit < 0 ? Math.abs(grossProfit) : 0);
    
    const netProfit = totalIndirectIncome - totalIndirectExpense;

    return {
      directIncomes: directIncomes.filter(b => b.netCr > 0 || b.netDr < 0 || b.name === 'Closing Stock'),
      directExpenses: directExpenses.filter(b => b.netDr > 0 || b.netCr < 0 || b.name === 'Opening Stock'),
      grossProfit,
      indirectIncomes: indirectIncomes.filter(b => b.netCr > 0 || b.netDr < 0),
      indirectExpenses: indirectExpenses.filter(b => b.netDr > 0 || b.netCr < 0),
      netProfit,
      totalDirectIncome, totalDirectExpense,
      totalIndirectIncome, totalIndirectExpense,
      closingStockValue
    };
  }, [balances, stockItems, stockSummary]);

  const balanceSheet = useMemo(() => {
    const bsGroups = ['Capital Account', 'Current Assets', 'Current Liabilities', 'Fixed Assets', 'Sundry Debtors', 'Sundry Creditors', 'Cash-in-Hand', 'Bank Accounts', 'Primary'];
    const bsBalances = balances.filter(b => bsGroups.includes(b.group));

    const assets = bsBalances.filter(b => b.netDr > 0);
    const liabilities = bsBalances.filter(b => b.netCr > 0);

    let totalAssets = assets.reduce((sum, b) => sum + b.netDr, 0);
    let totalLiabilities = liabilities.reduce((sum, b) => sum + b.netCr, 0);

    // Add Closing Stock to Assets
    if (profitAndLoss.closingStockValue > 0) {
      assets.push({ name: 'Closing Stock', group: 'Stock', dr: profitAndLoss.closingStockValue, cr: 0, netDr: profitAndLoss.closingStockValue, netCr: 0 });
      totalAssets += profitAndLoss.closingStockValue;
    }

    // Add Net Profit to Liabilities (Capital) or Net Loss to Assets
    if (profitAndLoss.netProfit > 0) {
      liabilities.push({ name: 'Net Profit', group: 'P&L', dr: 0, cr: profitAndLoss.netProfit, netDr: 0, netCr: profitAndLoss.netProfit });
      totalLiabilities += profitAndLoss.netProfit;
    } else if (profitAndLoss.netProfit < 0) {
      assets.push({ name: 'Net Loss', group: 'P&L', dr: Math.abs(profitAndLoss.netProfit), cr: 0, netDr: Math.abs(profitAndLoss.netProfit), netCr: 0 });
      totalAssets += Math.abs(profitAndLoss.netProfit);
    }

    return { assets, liabilities, totalAssets, totalLiabilities };
  }, [balances, profitAndLoss]);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-display text-zinc-900">Financial Reports</h2>
          <p className="text-sm text-zinc-500 mt-1 font-medium">View your business performance</p>
        </div>
        <div className="flex gap-2 bg-zinc-100/80 p-1 rounded-xl border border-zinc-200/60 shadow-sm">
          <Button 
            variant={reportType === 'tb' ? 'primary' : 'ghost'} 
            onClick={() => setReportType('tb')}
            className={`rounded-lg transition-all ${reportType === 'tb' ? 'shadow-sm' : 'text-zinc-600 hover:text-zinc-900'}`}
          >
            Trial Balance
          </Button>
          <Button 
            variant={reportType === 'pl' ? 'primary' : 'ghost'} 
            onClick={() => setReportType('pl')}
            className={`rounded-lg transition-all ${reportType === 'pl' ? 'shadow-sm' : 'text-zinc-600 hover:text-zinc-900'}`}
          >
            Profit & Loss
          </Button>
          <Button 
            variant={reportType === 'bs' ? 'primary' : 'ghost'} 
            onClick={() => setReportType('bs')}
            className={`rounded-lg transition-all ${reportType === 'bs' ? 'shadow-sm' : 'text-zinc-600 hover:text-zinc-900'}`}
          >
            Balance Sheet
          </Button>
          <Button 
            variant={reportType === 'stock' ? 'primary' : 'ghost'} 
            onClick={() => setReportType('stock')}
            className={`rounded-lg transition-all ${reportType === 'stock' ? 'shadow-sm' : 'text-zinc-600 hover:text-zinc-900'}`}
          >
            Stock Summary
          </Button>
        </div>
      </div>

      {reportType === 'tb' && (
        <Card className="border-zinc-200/80 shadow-md overflow-hidden">
          <CardHeader className="bg-zinc-50/80 border-b border-zinc-200/80 py-6">
            <CardTitle className="text-center text-2xl font-display font-bold text-zinc-900">Trial Balance</CardTitle>
            <p className="text-center text-sm text-zinc-500 font-medium mt-1">As of {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                <TableHead className="font-semibold text-zinc-900">Particulars</TableHead>
                <TableHead className="w-48 text-right font-semibold text-zinc-900">Debit (₹)</TableHead>
                <TableHead className="w-48 text-right font-semibold text-zinc-900">Credit (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trialBalance.entries.map((entry, idx) => (
                <TableRow key={idx} className="hover:bg-zinc-50/50 transition-colors">
                  <TableCell className="font-medium text-zinc-800">{entry.name}</TableCell>
                  <TableCell className="text-right font-mono font-medium text-zinc-900">
                    {entry.netDr > 0 ? entry.netDr.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium text-zinc-900">
                    {entry.netCr > 0 ? entry.netCr.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-zinc-50/80 border-t-2 border-zinc-300 hover:bg-zinc-50/80">
                <TableCell className="text-right font-bold text-zinc-900 uppercase tracking-wider text-xs">Grand Total</TableCell>
                <TableCell className="text-right font-mono text-base font-bold text-zinc-900">
                  {trialBalance.totals.dr.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right font-mono text-base font-bold text-zinc-900">
                  {trialBalance.totals.cr.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      )}

      {reportType === 'pl' && (
        <Card className="border-zinc-200/80 shadow-md overflow-hidden">
          <CardHeader className="bg-zinc-50/80 border-b border-zinc-200/80 py-6">
            <CardTitle className="text-center text-2xl font-display font-bold text-zinc-900">Profit & Loss Account</CardTitle>
            <p className="text-center text-sm text-zinc-500 font-medium mt-1">For the period ending {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </CardHeader>
          <div className="grid grid-cols-2 divide-x divide-zinc-200/80">
            <div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                    <TableHead className="font-semibold text-zinc-900">Particulars (Dr)</TableHead>
                    <TableHead className="text-right font-semibold text-zinc-900">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitAndLoss.directExpenses.map((e, i) => (
                    <TableRow key={i} className="hover:bg-zinc-50/50 transition-colors"><TableCell className="font-medium text-zinc-800">{e.name}</TableCell><TableCell className="text-right font-mono font-medium text-zinc-900">{Math.abs(e.netDr - e.netCr).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell></TableRow>
                  ))}
                  {profitAndLoss.grossProfit > 0 && (
                    <TableRow className="font-semibold text-zinc-900 hover:bg-zinc-50/50 transition-colors"><TableCell>Gross Profit c/o</TableCell><TableCell className="text-right font-mono">{profitAndLoss.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell></TableRow>
                  )}
                  <TableRow className="bg-zinc-50/80 border-t border-zinc-300 hover:bg-zinc-50/80">
                    <TableCell className="font-bold text-zinc-900 uppercase tracking-wider text-xs">Total</TableCell><TableCell className="text-right font-mono font-bold text-zinc-900">{Math.max(profitAndLoss.totalDirectExpense, profitAndLoss.totalDirectIncome).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  
                  {profitAndLoss.grossProfit < 0 && (
                    <TableRow className="font-semibold text-zinc-900 hover:bg-zinc-50/50 transition-colors"><TableCell>Gross Loss b/f</TableCell><TableCell className="text-right font-mono">{Math.abs(profitAndLoss.grossProfit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell></TableRow>
                  )}
                  {profitAndLoss.indirectExpenses.map((e, i) => (
                    <TableRow key={i} className="hover:bg-zinc-50/50 transition-colors"><TableCell className="font-medium text-zinc-800">{e.name}</TableCell><TableCell className="text-right font-mono font-medium text-zinc-900">{Math.abs(e.netDr - e.netCr).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell></TableRow>
                  ))}
                  {profitAndLoss.netProfit > 0 && (
                    <TableRow className="font-bold text-emerald-600 bg-emerald-50/30 hover:bg-emerald-50/50 transition-colors"><TableCell>Net Profit</TableCell><TableCell className="text-right font-mono">{profitAndLoss.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell></TableRow>
                  )}
                  <TableRow className="bg-zinc-50/80 border-t border-zinc-300 hover:bg-zinc-50/80">
                    <TableCell className="font-bold text-zinc-900 uppercase tracking-wider text-xs">Total</TableCell><TableCell className="text-right font-mono font-bold text-zinc-900">{Math.max(profitAndLoss.totalIndirectExpense, profitAndLoss.totalIndirectIncome).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                    <TableHead className="font-semibold text-zinc-900">Particulars (Cr)</TableHead>
                    <TableHead className="text-right font-semibold text-zinc-900">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitAndLoss.directIncomes.map((e, i) => (
                    <TableRow key={i} className="hover:bg-zinc-50/50 transition-colors"><TableCell className="font-medium text-zinc-800">{e.name}</TableCell><TableCell className="text-right font-mono font-medium text-zinc-900">{Math.abs(e.netCr - e.netDr).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell></TableRow>
                  ))}
                  {profitAndLoss.grossProfit < 0 && (
                    <TableRow className="font-semibold text-zinc-900 hover:bg-zinc-50/50 transition-colors"><TableCell>Gross Loss c/o</TableCell><TableCell className="text-right font-mono">{Math.abs(profitAndLoss.grossProfit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell></TableRow>
                  )}
                  <TableRow className="bg-zinc-50/80 border-t border-zinc-300 hover:bg-zinc-50/80">
                    <TableCell className="font-bold text-zinc-900 uppercase tracking-wider text-xs">Total</TableCell><TableCell className="text-right font-mono font-bold text-zinc-900">{Math.max(profitAndLoss.totalDirectExpense, profitAndLoss.totalDirectIncome).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>

                  {profitAndLoss.grossProfit > 0 && (
                    <TableRow className="font-semibold text-zinc-900 hover:bg-zinc-50/50 transition-colors"><TableCell>Gross Profit b/f</TableCell><TableCell className="text-right font-mono">{profitAndLoss.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell></TableRow>
                  )}
                  {profitAndLoss.indirectIncomes.map((e, i) => (
                    <TableRow key={i} className="hover:bg-zinc-50/50 transition-colors"><TableCell className="font-medium text-zinc-800">{e.name}</TableCell><TableCell className="text-right font-mono font-medium text-zinc-900">{Math.abs(e.netCr - e.netDr).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell></TableRow>
                  ))}
                  {profitAndLoss.netProfit < 0 && (
                    <TableRow className="font-bold text-red-600 bg-red-50/30 hover:bg-red-50/50 transition-colors"><TableCell>Net Loss</TableCell><TableCell className="text-right font-mono">{Math.abs(profitAndLoss.netProfit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell></TableRow>
                  )}
                  <TableRow className="bg-zinc-50/80 border-t border-zinc-300 hover:bg-zinc-50/80">
                    <TableCell className="font-bold text-zinc-900 uppercase tracking-wider text-xs">Total</TableCell><TableCell className="text-right font-mono font-bold text-zinc-900">{Math.max(profitAndLoss.totalIndirectExpense, profitAndLoss.totalIndirectIncome).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      )}

      {reportType === 'bs' && (
        <Card className="border-zinc-200/80 shadow-md overflow-hidden">
          <CardHeader className="bg-zinc-50/80 border-b border-zinc-200/80 py-6">
            <CardTitle className="text-center text-2xl font-display font-bold text-zinc-900">Balance Sheet</CardTitle>
            <p className="text-center text-sm text-zinc-500 font-medium mt-1">As of {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </CardHeader>
          <div className="grid grid-cols-2 divide-x divide-zinc-200/80">
            <div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                    <TableHead className="font-semibold text-zinc-900">Liabilities</TableHead>
                    <TableHead className="text-right font-semibold text-zinc-900">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balanceSheet.liabilities.map((e, i) => (
                    <TableRow key={i} className="hover:bg-zinc-50/50 transition-colors">
                      <TableCell className={`font-medium ${e.name === 'Net Profit' ? 'font-bold text-emerald-600' : 'text-zinc-800'}`}>{e.name}</TableCell>
                      <TableCell className="text-right font-mono font-medium text-zinc-900">{Math.abs(e.netCr - e.netDr).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-zinc-50/80 border-t border-zinc-300 hover:bg-zinc-50/80">
                    <TableCell className="font-bold text-zinc-900 uppercase tracking-wider text-xs">Total</TableCell><TableCell className="text-right font-mono font-bold text-zinc-900">{balanceSheet.totalLiabilities.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                    <TableHead className="font-semibold text-zinc-900">Assets</TableHead>
                    <TableHead className="text-right font-semibold text-zinc-900">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balanceSheet.assets.map((e, i) => (
                    <TableRow key={i} className="hover:bg-zinc-50/50 transition-colors">
                      <TableCell className={`font-medium ${e.name === 'Net Loss' ? 'font-bold text-red-600' : 'text-zinc-800'}`}>{e.name}</TableCell>
                      <TableCell className="text-right font-mono font-medium text-zinc-900">{Math.abs(e.netDr - e.netCr).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-zinc-50/80 border-t border-zinc-300 hover:bg-zinc-50/80">
                    <TableCell className="font-bold text-zinc-900 uppercase tracking-wider text-xs">Total</TableCell><TableCell className="text-right font-mono font-bold text-zinc-900">{balanceSheet.totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      )}

      {reportType === 'stock' && (
        <Card className="border-zinc-200/80 shadow-md overflow-hidden">
          <CardHeader className="bg-zinc-50/80 border-b border-zinc-200/80 py-6">
            <CardTitle className="text-center text-2xl font-display font-bold text-zinc-900">Stock Summary</CardTitle>
            <p className="text-center text-sm text-zinc-500 font-medium mt-1">As of {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                <TableHead className="font-semibold text-zinc-900">Item Name</TableHead>
                <TableHead className="font-semibold text-zinc-900">Group</TableHead>
                <TableHead className="text-right font-semibold text-zinc-900">Closing Qty</TableHead>
                <TableHead className="text-right font-semibold text-zinc-900">Closing Value (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockSummary.map((item, idx) => (
                <TableRow key={idx} className="hover:bg-zinc-50/50 transition-colors">
                  <TableCell className="font-semibold text-zinc-900">{item.name}</TableCell>
                  <TableCell className="text-zinc-600 font-medium">{item.group}</TableCell>
                  <TableCell className="text-right font-mono font-medium text-zinc-900">
                    {item.qty} <span className="text-zinc-500 text-xs ml-1">{item.unit}</span>
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium text-zinc-900">
                    {item.value > 0 ? item.value.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                  </TableCell>
                </TableRow>
              ))}
              {stockSummary.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-zinc-400 gap-3">
                      <p className="font-medium">No stock items found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
