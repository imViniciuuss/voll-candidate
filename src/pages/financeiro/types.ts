export type TransactionType = 'pagar' | 'receber';
export type TransactionStatus = 'pendente' | 'pago' | 'cancelado';

export interface Transaction {
  id: number;
  student_id: number | null;
  type: TransactionType;
  description: string;
  amount: number;
  due_date: string;
  status: TransactionStatus;
  created_at: string;
  students: { name: string } | null;
}

export interface Student {
  id: number;
  name: string;
}
