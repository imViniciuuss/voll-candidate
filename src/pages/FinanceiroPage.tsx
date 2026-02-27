import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import LancamentoModal, { LancamentoForm } from '../components/financeiro/LancamentoModal';
import TransactionRow from '../components/financeiro/TransactionRow';
import { Transaction, Student, TransactionType, TransactionStatus } from "@/types/types"

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type FilterType = 'todos' | TransactionType;

function computeSummary(transactions: Transaction[]) {
  const sum = (fn: (t: Transaction) => boolean) =>
    transactions.filter(fn).reduce((acc, t) => acc + Number(t.amount), 0);

  return {
    toReceive: sum((t) => t.type === 'receber' && t.status === 'pendente'),
    toPay:     sum((t) => t.type === 'pagar'   && t.status === 'pendente'),
    balance:   sum((t) => t.type === 'receber' && t.status === 'pago') -
               sum((t) => t.type === 'pagar'   && t.status === 'pago'),
  };
}

export default function FinanceiroPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>('todos');

  const fetchTransactions = async () => {
    setLoading(true);
    const res  = await fetch('/api/transactions');
    const data = await res.json();
    setTransactions(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchTransactions(); }, []);

  useEffect(() => {
    fetch('/api/students')
      .then((r) => r.json())
      .then((data) => setStudents(data ?? []))
      .catch(console.error);
  }, []);

  const handleAdd = async (form: LancamentoForm) => {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type:        form.type,
        description: form.description,
        amount:      Number(form.amount),
        due_date:    form.due_date,
        student_id:  form.student_id ? Number(form.student_id) : null,
      }),
    });
    if (res.ok) { setIsModalOpen(false); fetchTransactions(); }
  };

  const handleUpdateStatus = async (id: number, status: TransactionStatus) => {
    await fetch(`/api/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchTransactions();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    fetchTransactions();
  };

  const filtered = filter === 'todos' ? transactions : transactions.filter((t) => t.type === filter);
  const summary  = computeSummary(transactions);

  return (
    <div className="p-8 overflow-y-auto flex-1">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Financeiro</h2>
          <p className="text-slate-500 text-sm">Controle de contas a pagar e a receber.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={18} />
          Novo Lançamento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <SummaryCard
          label="A Receber"
          value={formatCurrency(summary.toReceive)}
          icon={<TrendingUp size={20} className="text-blue-600" />}
          color="bg-blue-50"
        />
        <SummaryCard
          label="A Pagar"
          value={formatCurrency(summary.toPay)}
          icon={<TrendingDown size={20} className="text-rose-600" />}
          color="bg-rose-50"
        />
        <SummaryCard
          label="Saldo Realizado"
          value={formatCurrency(summary.balance)}
          icon={<DollarSign size={20} className={summary.balance >= 0 ? 'text-emerald-600' : 'text-amber-600'} />}
          color={summary.balance >= 0 ? 'bg-emerald-50' : 'bg-amber-50'}
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Lançamentos</h3>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {(['todos', 'receber', 'pagar'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                  filter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f === 'todos' ? 'Todos' : f === 'receber' ? 'A Receber' : 'A Pagar'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Descrição</th>
                <th className="px-6 py-4 font-semibold">Vencimento</th>
                <th className="px-6 py-4 font-semibold">Tipo</th>
                <th className="px-6 py-4 font-semibold">Valor</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Carregando lançamentos...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Nenhum lançamento encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <React.Fragment key={t.id}>
                    <TransactionRow
                      transaction={t}
                      onUpdateStatus={handleUpdateStatus}
                      onDelete={handleDelete}
                    />
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <LancamentoModal
        open={isModalOpen}
        students={students}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAdd}
      />
    </div>
  );
}

function SummaryCard({
  label, value, icon, color,
}: {
  label: string; value: string; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-slate-500 text-sm font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}
