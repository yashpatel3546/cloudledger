import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { StockItem } from '../types';
import { Edit, Trash2, Search, Package } from 'lucide-react';

const STOCK_GROUPS = ['Primary', 'Raw Materials', 'Finished Goods', 'Consumables'];
const UNITS = ['Nos', 'Pcs', 'Kg', 'Ltr', 'Box', 'Mtr'];

export function StockItems() {
  const { stockItems, addStockItem, updateStockItem, deleteStockItem } = useStore();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<Partial<StockItem>>({
    name: '',
    group: 'Primary',
    unit: 'Nos',
    openingQuantity: 0,
    openingRate: 0,
    openingValue: 0
  });

  const searchRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredStockItems = useMemo(() => {
    return stockItems.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.group.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [stockItems, searchTerm]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        if (!isCreating) {
          setIsCreating(true);
          setTimeout(() => nameRef.current?.focus(), 50);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (isCreating) {
          formRef.current?.requestSubmit();
        }
      }

      // Enter acts like Tab to move to next field
      if (e.key === 'Enter' && isCreating && e.target instanceof HTMLElement && e.target.tagName !== 'BUTTON') {
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
      if (e.key === 'Backspace' && isCreating && e.target instanceof HTMLElement && e.target.tagName !== 'BUTTON') {
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

      if (e.key === 'Escape' && isCreating) {
        handleCancel();
      }

      if (!isCreating && document.activeElement?.tagName !== 'INPUT') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredStockItems.length - 1));
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
        }
        if (e.key === 'Enter' && filteredStockItems.length > 0) {
          e.preventDefault();
          handleEdit(filteredStockItems[selectedIndex]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreating, filteredStockItems, selectedIndex]);

  // Auto-calculate opening value
  useEffect(() => {
    if (formData.openingQuantity !== undefined && formData.openingRate !== undefined) {
      setFormData(prev => ({
        ...prev,
        openingValue: (prev.openingQuantity || 0) * (prev.openingRate || 0)
      }));
    }
  }, [formData.openingQuantity, formData.openingRate]);

  const handleEdit = (item: StockItem) => {
    setFormData(item);
    setEditingId(item.id);
    setIsCreating(true);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({ name: '', group: 'Primary', unit: 'Nos', openingQuantity: 0, openingRate: 0, openingValue: 0 });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.group || !formData.unit) return;
    
    const itemData = {
      name: formData.name,
      group: formData.group,
      unit: formData.unit,
      openingQuantity: Number(formData.openingQuantity) || 0,
      openingRate: Number(formData.openingRate) || 0,
      openingValue: Number(formData.openingValue) || 0,
    };

    if (editingId) {
      updateStockItem(editingId, itemData);
    } else {
      addStockItem({
        id: Date.now().toString(),
        ...itemData
      });
    }
    
    handleCancel();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-display text-zinc-900">Stock Items</h2>
          <p className="text-sm text-zinc-500 mt-1 font-medium">Manage your inventory</p>
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
          <Button onClick={isCreating ? handleCancel : () => { setIsCreating(true); setTimeout(() => nameRef.current?.focus(), 50); }} className="shadow-sm">
            {isCreating ? 'Cancel (Esc)' : 'Create Item (Alt+C)'}
          </Button>
        </div>
      </div>

      {isCreating && (
        <Card className="border-zinc-200/80 shadow-md">
          <CardHeader className="border-b border-zinc-100 bg-zinc-50/50 pb-4">
            <CardTitle className="text-lg font-display font-bold">{editingId ? 'Edit Stock Item' : 'New Stock Item Creation'}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Name</label>
                  <Input 
                    ref={nameRef}
                    required 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    placeholder="e.g. iPhone 15" 
                    className="font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Under Group</label>
                  <Select 
                    value={formData.group} 
                    onChange={e => setFormData({...formData, group: e.target.value})}
                    className="font-medium"
                  >
                    {STOCK_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Unit</label>
                  <Select 
                    value={formData.unit} 
                    onChange={e => setFormData({...formData, unit: e.target.value})}
                    className="font-medium"
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Opening Quantity</label>
                  <Input 
                    type="number" 
                    value={formData.openingQuantity} 
                    onChange={e => setFormData({...formData, openingQuantity: Number(e.target.value)})} 
                    className="font-mono font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Rate</label>
                  <Input 
                    type="number" 
                    value={formData.openingRate} 
                    onChange={e => setFormData({...formData, openingRate: Number(e.target.value)})} 
                    className="font-mono font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Value</label>
                  <Input 
                    type="number" 
                    value={formData.openingValue} 
                    disabled
                    className="bg-zinc-50/50 text-zinc-600 font-mono font-medium"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-6 border-t border-zinc-100 gap-3">
                <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
                <Button type="submit">{editingId ? 'Update Item (Ctrl+A)' : 'Save Item (Ctrl+A)'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm border-zinc-200/80 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/80 hover:bg-zinc-50/80">
              <TableHead className="font-semibold text-zinc-900">Name</TableHead>
              <TableHead className="font-semibold text-zinc-900">Group</TableHead>
              <TableHead className="text-right font-semibold text-zinc-900">Quantity</TableHead>
              <TableHead className="text-right font-semibold text-zinc-900">Rate</TableHead>
              <TableHead className="text-right font-semibold text-zinc-900">Value</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStockItems.map((item, index) => (
              <TableRow 
                key={item.id} 
                className={`group transition-colors cursor-pointer ${index === selectedIndex ? 'bg-zinc-50' : 'hover:bg-zinc-50/50'}`}
                onClick={() => setSelectedIndex(index)}
              >
                <TableCell className="font-semibold text-zinc-900">
                  {item.name}
                  {index === selectedIndex && <span className="ml-3 text-[10px] text-zinc-400 font-mono border border-zinc-200 bg-white rounded px-1.5 py-0.5 shadow-sm">Enter to edit</span>}
                </TableCell>
                <TableCell className="text-zinc-600 font-medium">{item.group}</TableCell>
                <TableCell className="text-right font-mono font-medium text-zinc-900">{item.openingQuantity} <span className="text-zinc-500 text-xs ml-1">{item.unit}</span></TableCell>
                <TableCell className="text-right font-mono font-medium text-zinc-900">{item.openingRate.toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono font-medium text-zinc-900">{item.openingValue.toLocaleString()}</TableCell>
                <TableCell className="text-right p-2">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(item); }} className="h-8 w-8 text-zinc-400 hover:text-zinc-900 hover:bg-white shadow-sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteStockItem(item.id); }} className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50 shadow-sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredStockItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-zinc-400 gap-3">
                    <Package className="h-8 w-8 text-zinc-300" />
                    <p className="font-medium">No stock items found.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
