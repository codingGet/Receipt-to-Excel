/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useRef, ChangeEvent, DragEvent } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { ReceiptData } from './types';
import { extractReceiptData } from './lib/gemini';
import { cn } from './lib/utils';

export default function App() {
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const exportToExcel = () => {
    const completedReceipts = receipts.filter(r => r.status === 'completed');
    if (completedReceipts.length === 0) return;

    const data = completedReceipts.map((r, index) => ({
      'No': r.no,
      'Description': r.description,
      'Final Amount': r.finalAmount,
      'Date': r.date
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Receipts");
    
    XLSX.writeFile(workbook, `receipts_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="text-emerald-600" size={32} />
              Receipt to Excel
            </h1>
            <p className="text-slate-500 mt-1">Extract data from receipts automatically using AI</p>
          </div>
          
          {receipts.some(r => r.status === 'completed') && (
            <button
              onClick={exportToExcel}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-sm hover:shadow-md active:scale-95"
            >
              <Download size={20} />
              Export to Excel
            </button>
          )}
        </header>

        {/* Upload Area */}
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
            <h3 className="text-xl font-semibold text-slate-800">Click or drag receipt images here</h3>
            <p className="text-slate-500 mt-2">Supports JPG, PNG, WEBP</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center gap-3">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        {/* Results List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-700 px-1">
            Processed Receipts ({receipts.length})
          </h2>
          
          <AnimatePresence initial={false}>
            {receipts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-400"
              >
                <FileText size={48} className="mx-auto mb-4 opacity-20" />
                <p>No receipts uploaded yet</p>
              </motion.div>
            ) : (
              receipts.map((receipt) => (
                <motion.div
                  key={receipt.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center shrink-0",
                        receipt.status === 'processing' ? "bg-blue-50 text-blue-600" :
                        receipt.status === 'completed' ? "bg-emerald-50 text-emerald-600" :
                        "bg-red-50 text-red-600"
                      )}>
                        {receipt.status === 'processing' ? <Loader2 className="animate-spin" /> :
                         receipt.status === 'completed' ? <CheckCircle2 /> :
                         <AlertCircle />}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-1 flex-1">
                        <div className="col-span-2 md:col-span-1">
                          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">No</p>
                          <p className="font-medium text-slate-900 truncate">{receipt.no}</p>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Description</p>
                          <p className="font-medium text-slate-900 truncate">{receipt.description}</p>
                        </div>
                        <div className="col-span-1">
                          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Amount</p>
                          <p className="font-medium text-slate-900">
                            {receipt.status === 'completed' ? `$${receipt.finalAmount.toFixed(2)}` : '-'}
                          </p>
                        </div>
                        <div className="col-span-1">
                          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Date</p>
                          <p className="font-medium text-slate-900">{receipt.date}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0">
                      <button
                        onClick={() => removeReceipt(receipt.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

