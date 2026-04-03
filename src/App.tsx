/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useRef, ChangeEvent, DragEvent, useMemo, FormEvent } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Download,
  LayoutDashboard,
  Receipt,
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  Calendar,
  Tag,
  ChevronRight,
  History
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { ReceiptData, Transaction, TransactionType, ToastmastersCategory } from './types';
import { extractReceiptData } from './lib/gemini';
import { cn } from './lib/utils';

const CATEGORIES: ToastmastersCategory[] = [
  'Membership Dues', 
  'Meeting Fees', 
  'Sponsorship', 
  'Venue Rental', 
  'Refreshments', 
  'Trophies & Awards', 
  'Education Materials', 
  'Marketing & PR', 
  'Club Supplies', 
  'Other'
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'scanner' | 'accounting'>('scanner');
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Accounting Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTx, setNewTx] = useState<Partial<Transaction>>({
    type: 'expense',
    category: 'Other',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    description: ''
  });

  const processFile = async (file: File) => {
    const id = Math.random().toString(36).substring(7);
    const newReceipt: ReceiptData = {
      id,
      no: '...',
      description: 'Processing...',
      finalAmount: 0,
      date: '...',
      fileName: file.name,
      status: 'processing'
    };

    setReceipts(prev => [newReceipt, ...prev]);
    setIsProcessing(true);
    setError(null);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const base64 = await base64Promise;
      const result = await extractReceiptData(base64, file.type);

      setReceipts(prev => prev.map(r => 
        r.id === id ? {
          ...r,
          no: result.no,
          description: result.description,
          finalAmount: result.finalAmount,
          date: result.date,
          status: 'completed'
        } : r
      ));
    } catch (err) {
      console.error("Extraction error:", err);
      setReceipts(prev => prev.map(r => 
        r.id === id ? { ...r, status: 'error', description: 'Failed to extract' } : r
      ));
      setError("Failed to process some images. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(processFile);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      Array.from(e.dataTransfer.files).forEach(processFile);
    }
  };

  const removeReceipt = (id: string) => {
    setReceipts(prev => prev.filter(r => r.id !== id));
  };

  const addToAccounting = (receipt: ReceiptData) => {
    const tx: Transaction = {
      id: Math.random().toString(36).substring(7),
      date: receipt.date,
      description: receipt.description,
      amount: receipt.finalAmount,
      type: 'expense',
      category: 'Other',
      receiptId: receipt.id
    };
    setTransactions(prev => [tx, ...prev]);
    setActiveTab('accounting');
    setShowAddForm(true);
    setNewTx(tx);
  };

  const handleAddTransaction = (e: FormEvent) => {
    e.preventDefault();
    if (!newTx.description || !newTx.amount) return;

    const tx: Transaction = {
      id: newTx.id || Math.random().toString(36).substring(7),
      date: newTx.date || new Date().toISOString().split('T')[0],
      description: newTx.description,
      amount: Number(newTx.amount),
      type: newTx.type as TransactionType,
      category: newTx.category as ToastmastersCategory,
      receiptId: newTx.receiptId
    };

    if (newTx.id) {
      setTransactions(prev => prev.map(t => t.id === newTx.id ? tx : t));
    } else {
      setTransactions(prev => [tx, ...prev]);
    }

    setShowAddForm(false);
    setNewTx({
      type: 'expense',
      category: 'Other',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      description: ''
    });
  };

  const totals = useMemo(() => {
    return transactions.reduce((acc, tx) => {
      if (tx.type === 'income') acc.income += tx.amount;
      else acc.expense += tx.amount;
      return acc;
    }, { income: 0, expense: 0 });
  }, [transactions]);

  const exportToExcel = () => {
    const data = transactions.map(t => ({
      'Date': t.date,
      'Type': t.type.toUpperCase(),
      'Category': t.category,
      'Description': t.description,
      'Amount': t.amount
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ledger");
    XLSX.writeFile(workbook, `toastmasters_ledger_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navigation Sidebar/TopBar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 p-1.5 rounded-lg text-white">
              <LayoutDashboard size={20} />
            </div>
            <span className="font-bold text-lg tracking-tight hidden sm:block">Toastmasters Ledger</span>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('scanner')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                activeTab === 'scanner' ? "bg-white shadow-sm text-emerald-600" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Receipt size={16} />
              Scanner
            </button>
            <button
              onClick={() => setActiveTab('accounting')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                activeTab === 'accounting' ? "bg-white shadow-sm text-emerald-600" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Wallet size={16} />
              Accounting
            </button>
          </div>

          <div className="flex items-center gap-2">
            {transactions.length > 0 && (
              <button 
                onClick={exportToExcel}
                className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
                title="Export Ledger"
              >
                <Download size={20} />
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'scanner' ? (
            <motion.div
              key="scanner"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* Scanner Content */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-1">Receipt Scanner</h2>
                <p className="text-slate-500">Upload receipts to extract data and add to your ledger</p>
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "relative border-2 border-dashed rounded-2xl p-12 mb-8 transition-all cursor-pointer text-center",
                  "bg-white hover:bg-slate-50 border-slate-200 hover:border-emerald-400 group"
                )}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={onFileChange}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Upload size={32} />
                  </div>
                  <h3 className="text-xl font-semibold">Drop receipt images here</h3>
                  <p className="text-slate-500 mt-2">AI will extract No, Description, Amount and Date</p>
                </div>
              </div>

              <div className="space-y-4">
                {receipts.map((receipt) => (
                  <motion.div
                    key={receipt.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                          receipt.status === 'processing' ? "bg-blue-50 text-blue-600" :
                          receipt.status === 'completed' ? "bg-emerald-50 text-emerald-600" :
                          "bg-red-50 text-red-600"
                        )}>
                          {receipt.status === 'processing' ? <Loader2 className="animate-spin" size={20} /> :
                           receipt.status === 'completed' ? <CheckCircle2 size={20} /> :
                           <AlertCircle size={20} />}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">No</p>
                            <p className="text-sm font-medium truncate">{receipt.no}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Description</p>
                            <p className="text-sm font-medium truncate">{receipt.description}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Amount</p>
                            <p className="text-sm font-bold text-emerald-600">
                              {receipt.status === 'completed' ? `$${receipt.finalAmount.toFixed(2)}` : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Date</p>
                            <p className="text-sm font-medium">{receipt.date}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {receipt.status === 'completed' && (
                          <button
                            onClick={() => addToAccounting(receipt)}
                            className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
                          >
                            <Plus size={14} />
                            Add to Ledger
                          </button>
                        )}
                        <button
                          onClick={() => removeReceipt(receipt.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="accounting"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-500">Total Balance</p>
                    <Wallet className="text-emerald-600" size={20} />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900">
                    ${(totals.income - totals.expense).toFixed(2)}
                  </h3>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-500">Total Income</p>
                    <ArrowUpCircle className="text-emerald-500" size={20} />
                  </div>
                  <h3 className="text-3xl font-bold text-emerald-600">
                    +${totals.income.toFixed(2)}
                  </h3>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-500">Total Expenses</p>
                    <ArrowDownCircle className="text-red-500" size={20} />
                  </div>
                  <h3 className="text-3xl font-bold text-red-600">
                    -${totals.expense.toFixed(2)}
                  </h3>
                </div>
              </div>

              {/* Ledger Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Club Ledger</h2>
                <button
                  onClick={() => {
                    setNewTx({
                      type: 'expense',
                      category: 'Other',
                      date: new Date().toISOString().split('T')[0],
                      amount: 0,
                      description: ''
                    });
                    setShowAddForm(true);
                  }}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
                >
                  <Plus size={20} />
                  New Transaction
                </button>
              </div>

              {/* Add/Edit Form */}
              <AnimatePresence>
                {showAddForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <form onSubmit={handleAddTransaction} className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Type</label>
                          <select
                            value={newTx.type}
                            onChange={e => setNewTx({...newTx, type: e.target.value as TransactionType})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                          >
                            <option value="income">Income (+)</option>
                            <option value="expense">Expense (-)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Category</label>
                          <select
                            value={newTx.category}
                            onChange={e => setNewTx({...newTx, category: e.target.value as ToastmastersCategory})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                          >
                            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Date</label>
                          <input
                            type="date"
                            value={newTx.date}
                            onChange={e => setNewTx({...newTx, date: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Amount</label>
                          <input
                            type="number"
                            step="0.01"
                            value={newTx.amount}
                            onChange={e => setNewTx({...newTx, amount: Number(e.target.value)})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Description</label>
                        <input
                          type="text"
                          value={newTx.description}
                          onChange={e => setNewTx({...newTx, description: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                          placeholder="e.g. Venue rental for April meeting"
                        />
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddForm(false)}
                          className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                          {newTx.id ? 'Update Transaction' : 'Save Transaction'}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Transaction List */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Amount</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                            <History size={40} className="mx-auto mb-3 opacity-20" />
                            <p>No transactions recorded yet</p>
                          </td>
                        </tr>
                      ) : (
                        transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                              <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-slate-400" />
                                {tx.date}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                <Tag size={10} />
                                {tx.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                              {tx.description}
                            </td>
                            <td className={cn(
                              "px-6 py-4 whitespace-nowrap text-sm font-bold text-right",
                              tx.type === 'income' ? "text-emerald-600" : "text-red-600"
                            )}>
                              {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    setNewTx(tx);
                                    setShowAddForm(true);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                >
                                  <ChevronRight size={18} />
                                </button>
                                <button
                                  onClick={() => setTransactions(prev => prev.filter(t => t.id !== tx.id))}
                                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}


