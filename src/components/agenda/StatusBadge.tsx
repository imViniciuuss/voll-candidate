import { ScheduleStatus } from '../../../types/types';

const STATUS_STYLES: Record<ScheduleStatus, string> = {
  Agendado: 'bg-blue-100 text-blue-700',
  Concluido: 'bg-emerald-100 text-emerald-700',
  Cancelado: 'bg-red-100 text-red-700',
};

export default function StatusBadge({ status }: { status: ScheduleStatus }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}
