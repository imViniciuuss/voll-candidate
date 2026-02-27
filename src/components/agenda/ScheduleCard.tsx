import { motion } from 'motion/react';
import { Check, Ban, Sparkles, Eye } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { Schedule, ScheduleStatus } from '../../../types/types';
import { formatTime } from '@/utils/utils';

interface Props {
  schedule: Schedule;
  onUpdateStatus: (id: number, status: ScheduleStatus) => void | Promise<void>;
  onGenerateDescription: (schedule: Schedule) => void | Promise<void>;
  onViewDescription: (schedule: Schedule) => void;
  generating?: boolean;
}

export default function ScheduleCard({ schedule, onUpdateStatus, onGenerateDescription, onViewDescription, generating }: Props) {
  const initial = schedule.students?.name?.charAt(0).toUpperCase() ?? '?';
  const hasDescription = !!schedule.ai_description;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:border-slate-300 transition-all group shadow-sm"
    >
      <div className="text-center w-16 flex-shrink-0">
        <p className="text-base font-bold text-slate-800 leading-tight">
          {formatTime(schedule.scheduled_at)}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">{schedule.duration_minutes}min</p>
      </div>

      <div className="w-px h-10 bg-slate-100 flex-shrink-0" />

      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-slate-800 text-sm truncate">
            {schedule.students?.name ?? 'Aluno não encontrado'}
          </p>
          <p className="text-xs text-slate-400">{schedule.lesson_type ?? 'Individual'}</p>
        </div>
      </div>

      {schedule.notes && (
        <p className="text-xs text-slate-400 italic hidden lg:block max-w-[180px] truncate">
          "{schedule.notes}"
        </p>
      )}

      <StatusBadge status={schedule.status} />

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {hasDescription && (
          <button
            onClick={() => onViewDescription(schedule)}
            title="Ver descrição da aula"
            className="p-1.5 text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
          >
            <Eye size={15} />
          </button>
        )}

        {schedule.status === 'Agendado' && (
          <>
            <button
              onClick={() => onGenerateDescription(schedule)}
              title={generating ? 'Gerando descrição...' : hasDescription ? 'Regerar descrição com IA' : 'Gerar descrição com IA'}
              disabled={!!generating}
              className={`p-1.5 rounded-lg transition-colors ${
                generating
                  ? 'text-violet-400 bg-violet-50 cursor-wait'
                  : 'text-violet-600 hover:bg-violet-50'
              }`}
            >
              <Sparkles size={15} />
            </button>
            <button
              onClick={() => onUpdateStatus(schedule.id, 'Concluido')}
              title="Marcar como concluído"
              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              <Check size={15} />
            </button>
            <button
              onClick={() => onUpdateStatus(schedule.id, 'Cancelado')}
              title="Cancelar aula"
              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Ban size={15} />
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
