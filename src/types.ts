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
