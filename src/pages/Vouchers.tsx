import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { VoucherType, VoucherEntry, InventoryEntry } from '../types';
import { Plus, Trash2, CheckCircle2, AlertCircle, Package, ArrowRightLeft } from 'lucide-react';

export function Vouchers() {
  const { ledgers, vouchers, stockItems, addVoucher, updateVoucher } = useStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editId = searchParams.get('edit');

  const [voucherType, setVoucherType] = useState<VoucherType>('Payment');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [voucherNumber, setVoucherNumber] = useState('');
  const [narration, setNarration] = useState('');
  
  // Double Entry State
  const [entries, setEntries] = useState<VoucherEntry[]>([
    { id: '1', ledgerId: '', amount: 0, type: 'Dr' },
    { id: '2', ledgerId: '', amount: 0, type: 'Cr' },
  ]);
  
  // Single Entry State
  const [isSingleEntryMode, setIsSingleEntryMode] = useState(false);
  const [singleEntryAccountId, setSingleEntryAccountId] = useState('');
  const [singleEntryItems, setSingleEntryItems] = useState([{ id: '1', ledgerId: '', amount: 0 }]);

  const [inventoryEntries, setInventoryEntries] = useState<InventoryEntry[]>([]);

  const formRef = useRef<HTMLFormElement>(null);

  const isSingleEntrySupported = ['Payment', 'Receipt', 'Contra'].includes(voucherType);
  const showSingleEntry = isSingleEntryMode && isSingleEntrySupported;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F4 - F9 for Voucher Types
      if (e.key === 'F4') { e.preventDefault(); setVoucherType('Contra'); }
      if (e.key === 'F5') { e.preventDefault(); setVoucherType('Payment'); }
      if (e.key === 'F6') { e.preventDefault(); setVoucherType('Receipt'); }
      if (e.key === 'F7') { e.preventDefault(); setVoucherType('Journal'); }
      if (e.key === 'F8') { e.preventDefault(); setVoucherType('Sales'); }
      if (e.key === 'F9') { e.preventDefault(); setVoucherType('Purchase'); }

      // Ctrl+A to Save (Tally standard)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }

      // Enter acts like Tab to move to next field, Shift+Enter to go back
      if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.tagName !== 'BUTTON') {
        e.preventDefault();
        const form = formRef.current;
        if (form) {
          const elements = Array.from(form.querySelectorAll('input:not([disabled]), select:not([disabled]), button[type="submit"]')) as HTMLElement[];
          const index = elements.indexOf(e.target);
          if (e.shiftKey) {
            if (index > 0) elements[index - 1].focus();
          } else {
            if (index > -1 && index < elements.length - 1) elements[index + 1].focus();
          }
        }
      }

      // Backspace on empty input goes back
      if (e.key === 'Backspace' && e.target instanceof HTMLElement && e.target.tagName !== 'BUTTON') {
        const isInputEmpty = e.target instanceof HTMLInputElement && e.target.value === '';
        const isSelect = e.target instanceof HTMLSelectElement;
        if (isInputEmpty || isSelect) {
          const form = formRef.current;
          if (form) {
            const elements = Array.from(form.querySelectorAll('input:not([disabled]), select:not([disabled]), button[type="submit"]')) as HTMLElement[];
            const index = elements.indexOf(e.target);
            if (index > 0) {
              e.preventDefault();
              elements[index - 1].focus();
            }
          }
        }
      }

      // ArrowUp / ArrowDown for Grid Navigation
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.target instanceof HTMLElement) {
        const row = e.target.getAttribute('data-row');
        const col = e.target.getAttribute('data-col');
        if (row !== null && col !== null) {
          e.preventDefault();
          const nextRow = e.key === 'ArrowUp' ? parseInt(row) - 1 : parseInt(row) + 1;
          const nextInput = document.querySelector(`[data-row="${nextRow}"][data-col="${col}"]:not([disabled])`) as HTMLElement;
          if (nextInput) {
            nextInput.focus();
          }
        }
      }

      // ArrowLeft / ArrowRight between Dr and Cr
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.target instanceof HTMLElement) {
        const row = e.target.getAttribute('data-row');
        const col = e.target.getAttribute('data-col');
        if (row !== null && col !== null) {
          const inputVal = (e.target as HTMLInputElement).value;
          if (inputVal === '') {
            e.preventDefault();
            if (e.key === 'ArrowLeft' && col === 'cr') {
              const prevInput = document.querySelector(`[data-row="${row}"][data-col="dr"]:not([disabled])`) as HTMLElement;
              if (prevInput) prevInput.focus();
            } else if (e.key === 'ArrowRight' && col === 'dr') {
              const nextInput = document.querySelector(`[data-row="${row}"][data-col="cr"]:not([disabled])`) as HTMLElement;
              if (nextInput) nextInput.focus();
            }
          }
        }
      }

      // Alt+A to Add Entry
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (showSingleEntry) {
          handleAddSingleEntryItem();
        } else {
          handleAddEntry();
        }
      }

      // Escape to go back if editing
      if (e.key === 'Escape' && editId) {
        e.preventDefault();
        navigate('/daybook');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editId, navigate, showSingleEntry]);

  useEffect(() => {
    if (editId) {
      const v = vouchers.find(v => v.id === editId);
      if (v) {
        setVoucherType(v.type);
        setDate(v.date);
        setVoucherNumber(v.voucherNumber);
        setNarration(v.narration);
        setInventoryEntries(v.inventoryEntries || []);
        
        // Determine if it was saved as single entry (heuristic: one top account, rest opposite)
        const isSingleEntrySupportedType = ['Payment', 'Receipt', 'Contra'].includes(v.type);
        if (isSingleEntrySupportedType && v.entries.length >= 2) {
          const topType = v.type === 'Payment' ? 'Cr' : 'Dr';
          const topEntries = v.entries.filter(e => e.type === topType);
          if (topEntries.length === 1) {
            setIsSingleEntryMode(true);
            setSingleEntryAccountId(topEntries[0].ledgerId);
            setSingleEntryItems(v.entries.filter(e => e.type !== topType).map(e => ({ id: e.id, ledgerId: e.ledgerId, amount: e.amount })));
            setEntries(v.entries);
            return;
          }
        }
        
        setIsSingleEntryMode(false);
        setEntries(v.entries);
      }
    }
  }, [editId, vouchers]);

  const totals = useMemo(() => {
    return entries.reduce((acc, entry) => {
      if (entry.type === 'Dr') acc.dr += Number(entry.amount) || 0;
      if (entry.type === 'Cr') acc.cr += Number(entry.amount) || 0;
      return acc;
    }, { dr: 0, cr: 0 });
  }, [entries]);

  const singleEntryTotal = useMemo(() => {
    return singleEntryItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [singleEntryItems]);

  const handleAddEntry = () => {
    setEntries(prev => [...prev, { id: Date.now().toString(), ledgerId: '', amount: 0, type: 'Dr' }]);
  };

  const handleRemoveEntry = (id: string) => {
    setEntries(prev => {
      if (prev.length <= 2) return prev;
      return prev.filter(e => e.id !== id);
    });
  };

  const handleEntryChange = (id: string, field: keyof VoucherEntry, value: any) => {
    setEntries(entries.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const handleAddSingleEntryItem = () => {
    setSingleEntryItems(prev => [...prev, { id: Date.now().toString(), ledgerId: '', amount: 0 }]);
  };

  const handleRemoveSingleEntryItem = (id: string) => {
    setSingleEntryItems(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter(e => e.id !== id);
    });
  };

  const handleSingleEntryItemChange = (id: string, field: 'ledgerId' | 'amount', value: any) => {
    setSingleEntryItems(singleEntryItems.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const handleAddInventoryEntry = () => {
    setInventoryEntries(prev => [...prev, { id: Date.now().toString(), itemId: '', quantity: 0, rate: 0, amount: 0 }]);
  };

  const handleRemoveInventoryEntry = (id: string) => {
    setInventoryEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleInventoryChange = (id: string, field: keyof InventoryEntry, value: any) => {
    setInventoryEntries(inventoryEntries.map(e => {
      if (e.id === id) {
        const updated = { ...e, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          updated.amount = (Number(updated.quantity) || 0) * (Number(updated.rate) || 0);
        }
        return updated;
      }
      return e;
    }));
  };

  const isBalanced = showSingleEntry ? (singleEntryAccountId !== '' && singleEntryTotal > 0) : (totals.dr === totals.cr && totals.dr > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalEntries: VoucherEntry[] = [];

    if (showSingleEntry) {
      if (!singleEntryAccountId) {
        alert('Please select an Account at the top!');
        return;
      }
      if (singleEntryItems.some(item => !item.ledgerId)) {
        alert('Please select ledgers for all particulars!');
        return;
      }
      if (singleEntryTotal <= 0) {
        alert('Total amount must be greater than zero!');
        return;
      }

      if (voucherType === 'Payment') {
        finalEntries.push({ id: Date.now().toString() + 'top', ledgerId: singleEntryAccountId, amount: singleEntryTotal, type: 'Cr' });
        singleEntryItems.forEach((item, i) => {
          finalEntries.push({ id: Date.now().toString() + i, ledgerId: item.ledgerId, amount: Number(item.amount), type: 'Dr' });
        });
      } else if (voucherType === 'Receipt' || voucherType === 'Contra') {
        finalEntries.push({ id: Date.now().toString() + 'top', ledgerId: singleEntryAccountId, amount: singleEntryTotal, type: 'Dr' });
        singleEntryItems.forEach((item, i) => {
          finalEntries.push({ id: Date.now().toString() + i, ledgerId: item.ledgerId, amount: Number(item.amount), type: 'Cr' });
        });
      }
    } else {
      if (!isBalanced) {
        alert('Debit and Credit totals must match and be greater than zero!');
        return;
      }
      if (entries.some(e => !e.ledgerId)) {
        alert('Please select ledgers for all entries!');
        return;
      }
      finalEntries = entries.map(e => ({ ...e, amount: Number(e.amount) }));
    }

    const finalVoucherNumber = voucherNumber || `${voucherType.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    if (editId) {
      updateVoucher(editId, {
        date,
        type: voucherType,
        voucherNumber: finalVoucherNumber,
        entries: finalEntries,
        inventoryEntries: (voucherType === 'Sales' || voucherType === 'Purchase') ? inventoryEntries : undefined,
        narration,
      });
      alert('Voucher updated successfully!');
      navigate('/daybook');
    } else {
      addVoucher({
        id: Date.now().toString(),
        date,
        type: voucherType,
        voucherNumber: finalVoucherNumber,
        entries: finalEntries,
        inventoryEntries: (voucherType === 'Sales' || voucherType === 'Purchase') ? inventoryEntries : undefined,
        narration,
      });
      alert('Voucher saved successfully!');
      // Reset
      setEntries([
        { id: Date.now().toString() + '1', ledgerId: '', amount: 0, type: 'Dr' },
        { id: Date.now().toString() + '2', ledgerId: '', amount: 0, type: 'Cr' },
      ]);
      setSingleEntryAccountId('');
      setSingleEntryItems([{ id: Date.now().toString(), ledgerId: '', amount: 0 }]);
      setInventoryEntries([]);
      setNarration('');
      setVoucherNumber('');
    }
  };

  // Premium Grid Classes
  const gridInputClass = "h-11 w-full border-0 rounded-none bg-transparent focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-zinc-400 shadow-none px-3 text-sm";
  const gridAmountClass = "h-11 w-full border-0 rounded-none bg-transparent focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-zinc-400 shadow-none px-3 text-right font-mono text-base";
  const gridSelectClass = "h-11 w-full border-0 rounded-none bg-transparent focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-zinc-400 shadow-none px-3 text-sm";

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-display text-zinc-900">{editId ? 'Edit Voucher' : 'Accounting Vouchers'}</h2>
          <p className="text-sm text-zinc-500 mt-1 font-medium">{editId ? 'Update existing transaction' : 'Record your daily transactions'}</p>
        </div>
        {editId && (
          <Button variant="outline" onClick={() => navigate('/daybook')} className="shadow-sm">Back to Day Book (Esc)</Button>
        )}
      </div>

      <Card className="border-zinc-200/80 shadow-md overflow-hidden bg-white">
        <form ref={formRef} onSubmit={handleSubmit}>
          
          {/* VOUCHER HEADER */}
          <div className="p-6 border-b border-zinc-200 flex flex-col md:flex-row md:items-start justify-between gap-6 bg-white">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Select 
                  value={voucherType} 
                  onChange={(e) => {
                    setVoucherType(e.target.value as VoucherType);
                    if (!['Payment', 'Receipt', 'Contra'].includes(e.target.value)) {
                      setIsSingleEntryMode(false);
                    }
                  }}
                  className="text-3xl font-bold font-display tracking-tight border-none shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent w-auto cursor-pointer hover:text-zinc-600 transition-colors text-zinc-900"
                >
                  <option value="Contra">Contra (F4)</option>
                  <option value="Payment">Payment (F5)</option>
                  <option value="Receipt">Receipt (F6)</option>
                  <option value="Journal">Journal (F7)</option>
                  <option value="Sales">Sales (F8)</option>
                  <option value="Purchase">Purchase (F9)</option>
                </Select>
                
                {isSingleEntrySupported && (
                  <Button 
                    type="button"
                    variant="secondary" 
                    size="sm" 
                    onClick={() => setIsSingleEntryMode(!isSingleEntryMode)}
                    className="h-7 text-xs font-medium rounded-full px-3 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 shadow-sm"
                  >
                    <ArrowRightLeft className="h-3 w-3 mr-1.5" />
                    {isSingleEntryMode ? 'Double Entry' : 'Single Entry'}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-6 bg-zinc-50/80 p-3 rounded-xl border border-zinc-200/60 shadow-sm">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Voucher No.</label>
                <Input 
                  value={voucherNumber} 
                  onChange={(e) => setVoucherNumber(e.target.value)} 
                  placeholder="Auto"
                  className="w-24 h-8 text-sm font-semibold border-zinc-200 bg-white shadow-sm font-mono"
                />
              </div>
              <div className="w-px h-10 bg-zinc-200"></div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Date</label>
                <Input 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                  className="w-36 h-8 text-sm font-semibold border-zinc-200 bg-white shadow-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* SINGLE ENTRY ACCOUNT BAR */}
          {showSingleEntry && (
            <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50/80 flex items-center gap-4">
              <label className="text-sm font-semibold text-zinc-700 w-24">Account</label>
              <Select 
                value={singleEntryAccountId} 
                onChange={(e) => setSingleEntryAccountId(e.target.value)}
                className="max-w-md bg-white border-zinc-200 shadow-sm"
              >
                <option value="" disabled>Select Cash/Bank Account</option>
                {ledgers.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </Select>
            </div>
          )}

          {/* MAIN GRID */}
          <div className="w-full overflow-x-auto">
            {showSingleEntry ? (
              <Table className="w-full border-collapse">
                <TableHeader>
                  <TableRow className="border-b border-zinc-200 hover:bg-transparent">
                    <TableHead className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-r border-zinc-100 bg-zinc-50/80">Particulars</TableHead>
                    <TableHead className="w-48 px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right border-r border-zinc-100 bg-zinc-50/80">Amount (₹)</TableHead>
                    <TableHead className="w-12 bg-zinc-50/80"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {singleEntryItems.map((item, index) => (
                    <TableRow key={item.id} className="border-b border-zinc-100 hover:bg-zinc-50/30 transition-colors group">
                      <TableCell className="p-0 border-r border-zinc-100">
                        <Select 
                          value={item.ledgerId} 
                          onChange={(e) => handleSingleEntryItemChange(item.id, 'ledgerId', e.target.value)}
                          className={gridSelectClass}
                        >
                          <option value="" disabled>Select Ledger</option>
                          {ledgers.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell className="p-0 border-r border-zinc-100">
                        <Input 
                          type="number" 
                          value={item.amount || ''} 
                          onChange={(e) => handleSingleEntryItemChange(item.id, 'amount', e.target.value)}
                          className={gridAmountClass}
                          placeholder="0.00"
                          data-row={index}
                          data-col="amount"
                        />
                      </TableCell>
                      <TableCell className="p-0 text-center">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleRemoveSingleEntryItem(item.id)}
                          disabled={singleEntryItems.length <= 1}
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className={`border-b-0 hover:bg-transparent ${singleEntryTotal > 0 ? 'bg-emerald-50/30' : 'bg-zinc-50/30'}`}>
                    <TableCell className="p-4 text-right border-r border-zinc-100">
                      <div className="flex items-center justify-between w-full">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleAddSingleEntryItem}
                          className="text-zinc-500 hover:text-zinc-900 -ml-2"
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add Entry (Alt+A)
                        </Button>
                        <span className={`inline-flex items-center gap-1.5 font-semibold ${singleEntryTotal > 0 ? 'text-emerald-600' : 'text-zinc-500'}`}>
                          {singleEntryTotal > 0 ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                          Total
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="p-3 text-right font-mono text-base font-semibold border-r border-zinc-100 border-t-2 border-t-zinc-200">
                      {singleEntryTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <Table className="w-full border-collapse">
                <TableHeader>
                  <TableRow className="border-b border-zinc-200 hover:bg-transparent">
                    <TableHead className="w-24 px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-r border-zinc-100 bg-zinc-50/80">Dr/Cr</TableHead>
                    <TableHead className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-r border-zinc-100 bg-zinc-50/80">Particulars</TableHead>
                    <TableHead className="w-48 px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right border-r border-zinc-100 bg-zinc-50/80">Debit (₹)</TableHead>
                    <TableHead className="w-48 px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right border-r border-zinc-100 bg-zinc-50/80">Credit (₹)</TableHead>
                    <TableHead className="w-12 bg-zinc-50/80"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry, index) => (
                    <TableRow key={entry.id} className="border-b border-zinc-100 hover:bg-zinc-50/30 transition-colors group">
                      <TableCell className="p-0 border-r border-zinc-100">
                        <Select 
                          value={entry.type} 
                          onChange={(e) => handleEntryChange(entry.id, 'type', e.target.value)}
                          className={gridSelectClass}
                        >
                          <option value="Dr">Dr</option>
                          <option value="Cr">Cr</option>
                        </Select>
                      </TableCell>
                      <TableCell className="p-0 border-r border-zinc-100">
                        <Select 
                          value={entry.ledgerId} 
                          onChange={(e) => handleEntryChange(entry.id, 'ledgerId', e.target.value)}
                          className={gridSelectClass}
                        >
                          <option value="" disabled>Select Ledger</option>
                          {ledgers.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell className="p-0 border-r border-zinc-100">
                        <Input 
                          type="number" 
                          value={entry.type === 'Dr' ? entry.amount || '' : ''} 
                          onChange={(e) => handleEntryChange(entry.id, 'amount', e.target.value)}
                          disabled={entry.type === 'Cr'}
                          className={gridAmountClass}
                          placeholder={entry.type === 'Dr' ? '0.00' : ''}
                          data-row={index}
                          data-col="dr"
                        />
                      </TableCell>
                      <TableCell className="p-0 border-r border-zinc-100">
                        <Input 
                          type="number" 
                          value={entry.type === 'Cr' ? entry.amount || '' : ''} 
                          onChange={(e) => handleEntryChange(entry.id, 'amount', e.target.value)}
                          disabled={entry.type === 'Dr'}
                          className={gridAmountClass}
                          placeholder={entry.type === 'Cr' ? '0.00' : ''}
                          data-row={index}
                          data-col="cr"
                        />
                      </TableCell>
                      <TableCell className="p-0 text-center">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleRemoveEntry(entry.id)}
                          disabled={entries.length <= 2}
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Totals Row */}
                  <TableRow className={`border-b-0 hover:bg-transparent ${isBalanced ? 'bg-emerald-50/30' : 'bg-red-50/30'}`}>
                    <TableCell colSpan={2} className="p-4 text-right border-r border-zinc-100">
                      <div className="flex items-center justify-between w-full">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleAddEntry}
                          className="text-zinc-500 hover:text-zinc-900 -ml-2"
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add Entry (Alt+A)
                        </Button>
                        <span className={`inline-flex items-center gap-1.5 font-semibold ${isBalanced ? 'text-emerald-600' : 'text-red-500'}`}>
                          {isBalanced ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                          Total
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="p-3 text-right font-mono text-base font-semibold border-r border-zinc-100 border-t-2 border-t-zinc-200">
                      {totals.dr.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="p-3 text-right font-mono text-base font-semibold border-r border-zinc-100 border-t-2 border-t-zinc-200">
                      {totals.cr.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </div>

          {/* INVENTORY ALLOCATIONS */}
          {(voucherType === 'Sales' || voucherType === 'Purchase') && (
            <div className="border-t border-zinc-200 bg-white">
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
                  <Package className="h-4 w-4 text-zinc-500" />
                  Inventory Allocations
                </h3>
                <Button type="button" variant="outline" size="sm" onClick={handleAddInventoryEntry} className="h-8 text-xs bg-white">
                  <Plus className="h-3 w-3 mr-1.5" /> Add Item
                </Button>
              </div>
              {inventoryEntries.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <Table className="w-full border-collapse">
                    <TableHeader>
                      <TableRow className="border-b border-zinc-200 hover:bg-transparent">
                        <TableHead className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-r border-zinc-100 bg-zinc-50/30">Name of Item</TableHead>
                        <TableHead className="w-32 px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right border-r border-zinc-100 bg-zinc-50/30">Quantity</TableHead>
                        <TableHead className="w-32 px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right border-r border-zinc-100 bg-zinc-50/30">Rate</TableHead>
                        <TableHead className="w-32 px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right border-r border-zinc-100 bg-zinc-50/30">Amount</TableHead>
                        <TableHead className="w-12 bg-zinc-50/30"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventoryEntries.map((entry, index) => (
                        <TableRow key={entry.id} className="border-b border-zinc-100 hover:bg-zinc-50/30 transition-colors group">
                          <TableCell className="p-0 border-r border-zinc-100">
                            <Select 
                              value={entry.itemId} 
                              onChange={(e) => handleInventoryChange(entry.id, 'itemId', e.target.value)}
                              className={gridSelectClass}
                            >
                              <option value="" disabled>Select Item</option>
                              {stockItems.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </Select>
                          </TableCell>
                          <TableCell className="p-0 border-r border-zinc-100">
                            <Input 
                              type="number" 
                              value={entry.quantity || ''} 
                              onChange={(e) => handleInventoryChange(entry.id, 'quantity', e.target.value)}
                              className={gridAmountClass}
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell className="p-0 border-r border-zinc-100">
                            <Input 
                              type="number" 
                              value={entry.rate || ''} 
                              onChange={(e) => handleInventoryChange(entry.id, 'rate', e.target.value)}
                              className={gridAmountClass}
                              placeholder="0.00"
                            />
                          </TableCell>
                          <TableCell className="p-0 border-r border-zinc-100">
                            <Input 
                              type="number" 
                              value={entry.amount || ''} 
                              disabled
                              className={`${gridAmountClass} bg-zinc-50/50 text-zinc-600`}
                              placeholder="0.00"
                            />
                          </TableCell>
                          <TableCell className="p-0 text-center">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleRemoveInventoryEntry(entry.id)}
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-opacity"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-zinc-500">
                  <Package className="h-8 w-8 text-zinc-300" />
                  <p className="text-sm">No items allocated. Click "Add Item" to track inventory.</p>
                </div>
              )}
            </div>
          )}

          {/* FOOTER: NARRATION & SAVE */}
          <div className="p-6 bg-zinc-50/50 border-t border-zinc-200 flex flex-col md:flex-row gap-6 justify-between items-end">
            <div className="w-full max-w-2xl space-y-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Narration</label>
              <Input 
                value={narration} 
                onChange={(e) => setNarration(e.target.value)} 
                placeholder="Being..." 
                className="w-full bg-white border-zinc-200 shadow-sm h-10"
              />
            </div>
            <Button type="submit" size="lg" className="w-full md:w-48 font-medium shadow-sm" disabled={!isBalanced}>
              {editId ? 'Update Voucher (Ctrl+A)' : 'Save Voucher (Ctrl+A)'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
