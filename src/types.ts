export type TransactionType = 'income' | 'expense';

export type ToastmastersCategory = 
  | 'Membership Dues' 
  | 'Meeting Fees' 
  | 'Sponsorship' 
  | 'Venue Rental' 
  | 'Refreshments' 
  | 'Trophies & Awards' 
  | 'Education Materials' 
  | 'Marketing & PR' 
  | 'Club Supplies' 
  | 'Other';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: ToastmastersCategory;
  receiptId?: string;
}

export interface ReceiptData {
  id: string;
  no: string;
  description: string;
  finalAmount: number;
  date: string;
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

export interface GeminiExtractionResult {
  no: string;
  description: string;
  finalAmount: number;
  date: string;
}
