import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export function Settings() {
  const { company, setCompany } = useStore();
  const [formData, setFormData] = useState({
    name: '',
    financialYearStart: '',
    booksBeginningFrom: '',
  });

  const formRef = React.useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name,
        financialYearStart: company.financialYearStart,
        booksBeginningFrom: company.booksBeginningFrom,
      });
    }
  }, [company]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (company) {
      setCompany({
        ...company,
        ...formData,
      });
      alert('Company settings saved successfully!');
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      <div>
        <h2 className="text-3xl font-bold tracking-tight font-display text-zinc-900">Settings</h2>
        <p className="text-sm text-zinc-500 mt-1 font-medium">Manage your company preferences and details</p>
      </div>

      <Card className="border-zinc-200/80 shadow-md overflow-hidden">
        <CardHeader className="bg-zinc-50/80 border-b border-zinc-200/80 py-6">
          <CardTitle className="text-xl font-display font-bold text-zinc-900">Company Details</CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2.5">
              <label className="text-sm font-semibold text-zinc-900">Company Name</label>
              <Input 
                required 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder="e.g. CloudLedger Inc." 
                className="h-11 text-base shadow-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <label className="text-sm font-semibold text-zinc-900">Financial Year Begins From</label>
                <Input 
                  type="date"
                  required 
                  value={formData.financialYearStart} 
                  onChange={e => setFormData({...formData, financialYearStart: e.target.value})} 
                  className="h-11 font-mono font-medium shadow-sm"
                />
              </div>
              <div className="space-y-2.5">
                <label className="text-sm font-semibold text-zinc-900">Books Beginning From</label>
                <Input 
                  type="date"
                  required 
                  value={formData.booksBeginningFrom} 
                  onChange={e => setFormData({...formData, booksBeginningFrom: e.target.value})} 
                  className="h-11 font-mono font-medium shadow-sm"
                />
              </div>
            </div>
            
            <div className="pt-6 flex justify-end border-t border-zinc-100 mt-8">
              <Button type="submit" size="lg" className="shadow-sm font-semibold px-8">Save Settings</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
