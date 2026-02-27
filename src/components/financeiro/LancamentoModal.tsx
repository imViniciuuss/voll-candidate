import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X } from 'lucide-react';
import { Student, TransactionType } from '@/types/types';

const DEFAULT_FORM = {
  type: 'receber' as TransactionType,
  description: '',
  amount: '',
  due_date: new Date().toISOString().split('T')[0],
  student_id: '',
};

export type LancamentoForm = typeof DEFAULT_FORM;

interface Props {
  open: boolean;
  students: Student[];
  onClose: () => void;
  onSubmit: (form: LancamentoForm) => Promise<void>;
}

export default function LancamentoModal({ open, students, onClose, onSubmit }: Props) {
  const [form, setForm] = useState(DEFAULT_FORM);

  const set = (patch: Partial<LancamentoForm>) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
    setForm(DEFAULT_FORM);
  };

  const inputClass =
    'w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Novo Lançamento</h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                <div className="flex gap-2">
                  {(['receber', 'pagar'] as TransactionType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => set({ type: t })}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all capitalize ${
                        form.type === t
                          ? t === 'receber'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-rose-500 text-white shadow-md'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {t === 'receber' ? 'A Receber' : 'A Pagar'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                <input
                  required
                  type="text"
                  className={inputClass}
                  placeholder="Ex: Mensalidade janeiro"
                  value={form.description}
                  onChange={(e) => set({ description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor (R$)</label>
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    className={inputClass}
                    placeholder="0,00"
                    value={form.amount}
                    onChange={(e) => set({ amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vencimento</label>
                  <input
                    required
                    type="date"
                    className={inputClass}
                    value={form.due_date}
                    onChange={(e) => set({ due_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Aluno <span className="text-slate-400 normal-case font-normal">(opcional)</span>
                </label>
                <select
                  className={inputClass}
                  value={form.student_id}
                  onChange={(e) => set({ student_id: e.target.value })}
                >
                  <option value="">Nenhum</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Lançar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
