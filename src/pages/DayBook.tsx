import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { format } from 'date-fns';
import { Edit, Trash2, Search } from 'lucide-react';

export function DayBook() {
  const { vouchers, ledgers, deleteVoucher } = useStore();
  const navigate = useNavigate();
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const getLedgerName = (id: string) => ledgers.find(l => l.id === id)?.name || 'Unknown';

  const filteredVouchers = useMemo(() => {
    return vouchers
      .filter(v => v.date === dateFilter)
      .filter(v => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
          v.voucherNumber.toLowerCase().includes(term) ||
          v.narration.toLowerCase().includes(term) ||
          v.entries.some(e => getLedgerName(e.ledgerId).toLowerCase().includes(term))
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [vouchers, dateFilter, searchTerm, ledgers]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm, dateFilter]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchRef.current?.focus();
      }

      // Arrow Key Navigation for Table
      if (document.activeElement?.tagName !== 'INPUT') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredVouchers.length - 1));
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
        }
        if (e.key === 'Enter' && filteredVouchers.length > 0) {
          e.preventDefault();
          navigate(`/vouchers?edit=${filteredVouchers[selectedIndex].id}`);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredVouchers, selectedIndex, navigate]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-display text-zinc-900">Day Book</h2>
          <p className="text-sm text-zinc-500 mt-1 font-medium">Daily transaction register</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input 
              ref={searchRef}
              placeholder="Search (Press '/')" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64 bg-white shadow-sm"
            />
          </div>
          <Input 
            type="date" 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)} 
            className="w-40 bg-white shadow-sm font-mono font-medium"
          />
          <Button variant="outline" className="shadow-sm">Export</Button>
        </div>
      </div>

      <Card className="border-zinc-200/80 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/80 hover:bg-zinc-50/80">
              <TableHead className="w-32 font-semibold text-zinc-900">Date</TableHead>
              <TableHead className="font-semibold text-zinc-900">Particulars</TableHead>
              <TableHead className="w-32 font-semibold text-zinc-900">Vch Type</TableHead>
              <TableHead className="w-32 font-semibold text-zinc-900">Vch No.</TableHead>
              <TableHead className="w-32 text-right font-semibold text-zinc-900">Debit (₹)</TableHead>
              <TableHead className="w-32 text-right font-semibold text-zinc-900">Credit (₹)</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVouchers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-zinc-400 gap-3">
                    <Search className="h-8 w-8 text-zinc-300" />
                    <p className="font-medium">No transactions found for this date.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredVouchers.map((voucher, index) => (
                <React.Fragment key={voucher.id}>
                  {voucher.entries.map((entry, idx) => (
                    <TableRow 
                      key={entry.id} 
                      className={`
                        group transition-colors cursor-pointer
                        ${idx === voucher.entries.length - 1 ? 'border-b-2 border-zinc-200/80' : 'border-0'}
                        ${index === selectedIndex ? 'bg-zinc-50' : 'hover:bg-zinc-50/50'}
                      `}
                      onClick={() => setSelectedIndex(index)}
                    >
                      <TableCell className="text-zinc-500 font-medium">
                        {idx === 0 ? format(new Date(voucher.date), 'dd-MMM-yyyy') : ''}
                      </TableCell>
                      <TableCell className="font-semibold text-zinc-900">
                        <span className={entry.type === 'Cr' ? 'ml-8' : ''}>
                          <span className="text-zinc-400 font-normal mr-1">{entry.type === 'Cr' ? 'To' : 'By'}</span>
                          {getLedgerName(entry.ledgerId)}
                        </span>
                        {idx === voucher.entries.length - 1 && voucher.narration && (
                          <div className="text-xs text-zinc-500 mt-1.5 italic font-medium">
                            ({voucher.narration})
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-zinc-600 font-medium">{idx === 0 ? voucher.type : ''}</TableCell>
                      <TableCell className="text-zinc-900 font-mono font-medium">
                        {idx === 0 && (
                          <div className="flex items-center gap-2">
                            {voucher.voucherNumber}
                            {index === selectedIndex && <span className="text-[10px] text-zinc-400 font-mono border border-zinc-200 bg-white rounded px-1.5 py-0.5 shadow-sm">Enter to edit</span>}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-zinc-900">
                        {entry.type === 'Dr' ? entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-zinc-900">
                        {entry.type === 'Cr' ? entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}
                      </TableCell>
                      <TableCell className="text-right p-2">
                        {idx === 0 && (
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); navigate(`/vouchers?edit=${voucher.id}`); }} className="h-8 w-8 text-zinc-400 hover:text-zinc-900 hover:bg-white shadow-sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={(e) => {
                              e.stopPropagation();
                              if(window.confirm('Are you sure you want to delete this voucher?')) {
                                deleteVoucher(voucher.id);
                              }
                            }} className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50 shadow-sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
