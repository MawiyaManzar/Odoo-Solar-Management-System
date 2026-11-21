export interface QuoteLineItem {
  id: string;
  quoteId: string;
  productId: string;
  description: string | null;
  qty: number;
  unitPriceInr: number;
  lineTotalInr: number;
}

export interface QuoteItem {
  id: string;
  enquiryId: string;
  customerId: string;
  packageId: string | null;
  status: string;
  subtotalInr: number;
  discountInr: number;
  totalInr: number;
  validUntil: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  packageCode: string | null;
  customerPath?: string;
  lines?: QuoteLineItem[];
}
