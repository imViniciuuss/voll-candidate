import { Check, X, Trash2 } from 'lucide-react';
import { Transaction, TransactionStatus } from './types';

const STATUS_STYLES: Record<TransactionStatus, string> = {
  pendente: 'bg-amber-100 text-amber-700',
  pago: 'bg-emerald-100 text-emerald-700',
  cancelado: 'bg-slate-100 text-slate-500',
};

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (dateStr: string) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');

interface Props {
  transaction: Transaction;
  onUpdateStatus: (id: number, status: TransactionStatus) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function TransactionRow({ transaction: t, onUpdateStatus, onDelete }: Props) {
  const isOverdue =
    t.status === 'pendente' && new Date(t.due_date + 'T00:00:00') < new Date(new Date().toDateString());

  return (
    <tr className="hover:bg-slate-50/50 transition-colors group">
      <td className="px-6 py-4">
        <p className="font-semibold text-slate-800 text-sm">{t.description}</p>
        {t.students && <p className="text-xs text-slate-400 mt-0.5">{t.students.name}</p>}
      </td>

      <td className="px-6 py-4">
        <span className={`text-sm ${isOverdue ? 'text-red-500 font-semibold' : 'text-slate-600'}`}>
          {formatDate(t.due_date)}
          {isOverdue && <span className="ml-1 text-[10px] font-bold uppercase">· Vencido</span>}
        </span>
      </td>

      <td className="px-6 py-4">
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            t.type === 'receber'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-rose-100 text-rose-700'
          }`}
        >
          {t.type === 'receber' ? 'A Receber' : 'A Pagar'}
        </span>
      </td>

      <td className="px-6 py-4">
        <span
          className={`text-sm font-bold ${
            t.type === 'receber' ? 'text-emerald-600' : 'text-rose-600'
          } ${t.status === 'cancelado' ? 'line-through opacity-50' : ''}`}
        >
          {t.type === 'receber' ? '+' : '-'} {formatCurrency(t.amount)}
        </span>
      </td>

      <td className="px-6 py-4">
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[t.status]}`}>
          {t.status}
        </span>
      </td>

      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {t.status === 'pendente' && (
            <>
              <button
                onClick={() => onUpdateStatus(t.id, 'pago')}
                title="Marcar como pago"
                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              >
                <Check size={15} />
              </button>
              <button
                onClick={() => onUpdateStatus(t.id, 'cancelado')}
                title="Cancelar"
                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={15} />
              </button>
            </>
          )}
          <button
            onClick={() => onDelete(t.id)}
            title="Excluir"
            className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}
