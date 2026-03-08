import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Wallet, Activity, Receipt } from 'lucide-react';

export function Dashboard() {
  const { vouchers, ledgers } = useStore();

  const stats = useMemo(() => {
    let totalReceipts = 0;
    let totalPayments = 0;
    let cashBalance = 0;

    vouchers.forEach(v => {
      if (v.type === 'Receipt') {
        totalReceipts += v.entries.find(e => e.type === 'Cr')?.amount || 0;
      } else if (v.type === 'Payment') {
        totalPayments += v.entries.find(e => e.type === 'Dr')?.amount || 0;
      }
    });

    const cashLedgers = ledgers.filter(l => l.group === 'Cash-in-Hand');
    cashLedgers.forEach(cashLedger => {
      cashBalance += cashLedger.balanceType === 'Dr' ? cashLedger.openingBalance : -cashLedger.openingBalance;
      vouchers.forEach(v => {
        v.entries.forEach(e => {
          if (e.ledgerId === cashLedger.id) {
            if (e.type === 'Dr') cashBalance += e.amount;
            else cashBalance -= e.amount;
          }
        });
      });
    });

    return { totalReceipts, totalPayments, cashBalance };
  }, [vouchers, ledgers]);

  const chartData = useMemo(() => {
    if (vouchers.length === 0) {
      return [];
    }
    // Aggregate by month
    const monthlyData: Record<string, { name: string, receipts: number, payments: number }> = {};
    vouchers.forEach(v => {
      const month = new Date(v.date).toLocaleString('default', { month: 'short' });
      if (!monthlyData[month]) {
        monthlyData[month] = { name: month, receipts: 0, payments: 0 };
      }
      if (v.type === 'Receipt') {
        monthlyData[month].receipts += v.entries.find(e => e.type === 'Cr')?.amount || 0;
      } else if (v.type === 'Payment') {
        monthlyData[month].payments += v.entries.find(e => e.type === 'Dr')?.amount || 0;
      }
    });
    return Object.values(monthlyData);
  }, [vouchers]);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Total Receipts</CardTitle>
            <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center">
              <ArrowUpRight className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display tracking-tight text-zinc-900">₹{stats.totalReceipts.toLocaleString()}</div>
            <p className="text-xs text-zinc-500 mt-2 font-medium">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Total Payments</CardTitle>
            <div className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center">
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display tracking-tight text-zinc-900">₹{stats.totalPayments.toLocaleString()}</div>
            <p className="text-xs text-zinc-500 mt-2 font-medium">+4.5% from last month</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Cash Balance</CardTitle>
            <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-zinc-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display tracking-tight text-zinc-900">₹{stats.cashBalance.toLocaleString()}</div>
            <p className="text-xs text-zinc-500 mt-2 font-medium">Available liquidity</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Active Ledgers</CardTitle>
            <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center">
              <Activity className="h-4 w-4 text-zinc-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display tracking-tight text-zinc-900">{ledgers.length}</div>
            <p className="text-xs text-zinc-500 mt-2 font-medium">Total accounts</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 hover:shadow-md transition-shadow">
          <CardHeader className="border-b border-zinc-100 pb-4 mb-4">
            <CardTitle className="text-lg font-display font-bold">Cash Flow Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2 relative">
            <div className="h-[320px] w-full">
              {chartData.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-sm font-medium">
                  No cash flow data available yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12, fontWeight: 500 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12, fontWeight: 500 }} dx={-10} />
                    <Tooltip 
                      cursor={{ fill: '#f4f4f5' }}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    />
                    <Bar dataKey="receipts" fill="#18181b" radius={[6, 6, 0, 0]} name="Receipts" />
                    <Bar dataKey="payments" fill="#a1a1aa" radius={[6, 6, 0, 0]} name="Payments" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3 hover:shadow-md transition-shadow">
          <CardHeader className="border-b border-zinc-100 pb-4 mb-4">
            <CardTitle className="text-lg font-display font-bold">Recent Vouchers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {vouchers.slice(-5).reverse().map((voucher) => (
                <div key={voucher.id} className="flex items-center group p-2 -mx-2 rounded-lg hover:bg-zinc-50 transition-colors">
                  <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
                    <Receipt className="h-5 w-5 text-zinc-600" />
                  </div>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-semibold leading-none text-zinc-900">{voucher.type} - {voucher.voucherNumber}</p>
                    <p className="text-xs text-zinc-500 font-medium">
                      {new Date(voucher.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="ml-auto font-bold font-mono text-zinc-900">
                    ₹{voucher.entries[0]?.amount.toLocaleString()}
                  </div>
                </div>
              ))}
              {vouchers.length === 0 && (
                <div className="text-sm text-zinc-400 font-medium text-center py-12 flex flex-col items-center gap-3">
                  <Receipt className="h-8 w-8 text-zinc-300" />
                  No vouchers recorded yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
