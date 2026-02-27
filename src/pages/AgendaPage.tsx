import React, { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import ScheduleCard from '../components/agenda/ScheduleCard';
import NewScheduleModal, { ScheduleForm } from '../components/agenda/NewScheduleModal';
import { Schedule, Student, FilterType, ScheduleStatus } from '../../types/types';
import { getWeekStart, getWeekEnd, groupByDay, formatDayHeader } from '@/utils/utils';

export default function AgendaPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>('semana');
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [aiLoadingId, setAiLoadingId] = useState<number | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiModalContent, setAiModalContent] = useState('');
  const [aiModalSchedule, setAiModalSchedule] = useState<Schedule | null>(null);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();

    if (filter === 'hoje') {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end   = new Date(); end.setHours(23, 59, 59, 999);
      params.set('from', start.toISOString());
      params.set('to',   end.toISOString());
    } else if (filter === 'semana') {
      params.set('from', weekStart.toISOString());
      params.set('to',   getWeekEnd(weekStart).toISOString());
    }

    const res  = await fetch(`/api/schedules?${params}`);
    const data = await res.json();
    setSchedules(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [filter, weekStart]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  useEffect(() => {
    fetch('/api/students')
      .then((r) => r.json())
      .then((data) => setStudents(data ?? []))
      .catch(console.error);
  }, []);

  const handleAddSchedule = async (form: ScheduleForm) => {
    const scheduled_at = new Date(`${form.date}T${form.time}`).toISOString();
    const res = await fetch('/api/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: Number(form.student_id),
        scheduled_at,
        duration_minutes: form.duration_minutes,
        lesson_type: form.lesson_type,
        notes: form.notes || null,
      }),
    });
    if (res.ok) {
      setIsModalOpen(false);
      fetchSchedules();
    }
  };

  const handleUpdateStatus = async (id: number, status: ScheduleStatus) => {
    await fetch(`/api/schedules/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchSchedules();
  };

  const handleViewDescription = (schedule: Schedule) => {
    setAiModalSchedule(schedule);
    setAiModalContent(schedule.ai_description ?? '');
    setAiModalOpen(true);
  };

  const handleGenerateDescription = async (schedule: Schedule) => {
    try {
      setAiLoadingId(schedule.id);
      const res = await fetch(`/api/schedules/${schedule.id}/ai-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        console.error('Erro ao gerar descrição da aula');
        return;
      }
      const data = await res.json();
      const description = data.ai_description ?? '';
      setAiModalSchedule(schedule);
      setAiModalContent(description);
      setAiModalOpen(true);
      fetchSchedules();
    } catch (err) {
      console.error('Erro inesperado ao gerar descrição da aula:', err);
    } finally {
      setAiLoadingId(null);
    }
  };

  const shiftWeek = (direction: -1 | 1) =>
    setWeekStart((d) => {
      const n = new Date(d);
      n.setDate(n.getDate() + direction * 7);
      return n;
    });

  const weekEnd = getWeekEnd(weekStart);
  const weekLabel = `${weekStart.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} – ${weekEnd.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const grouped = groupByDay(schedules);

  return (
    <div className="p-8 overflow-y-auto flex-1">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Agenda</h2>
          <p className="text-slate-500 text-sm">Gerencie e acompanhe as aulas dos alunos.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={18} />
          Nova Aula
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {(['hoje', 'semana', 'todos'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f === 'hoje' ? 'Hoje' : f === 'semana' ? 'Esta Semana' : 'Todos'}
            </button>
          ))}
        </div>

        {filter === 'semana' && (
          <div className="flex items-center gap-2">
            <button onClick={() => shiftWeek(-1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronLeft size={18} className="text-slate-500" />
            </button>
            <span className="text-sm font-medium text-slate-700 min-w-[220px] text-center capitalize">
              {weekLabel}
            </span>
            <button onClick={() => shiftWeek(1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronRight size={18} className="text-slate-500" />
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">Carregando agenda...</div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar className="text-slate-400" size={28} />
          </div>
          <p className="text-slate-600 font-semibold">Nenhuma aula agendada</p>
          <p className="text-slate-400 text-sm mt-1">Clique em "Nova Aula" para adicionar.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([day, daySchedules]) => (
            <div key={day}>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="font-bold text-slate-700 capitalize text-sm">{formatDayHeader(day)}</h3>
                <span className="text-xs text-slate-400">
                  {daySchedules.length} aula{daySchedules.length !== 1 ? 's' : ''}
                </span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              <div className="space-y-2">
                {daySchedules.map((s) => (
                  <React.Fragment key={s.id}>
                    <ScheduleCard
                      schedule={s}
                      onUpdateStatus={handleUpdateStatus}
                      onGenerateDescription={handleGenerateDescription}
                      onViewDescription={handleViewDescription}
                      generating={aiLoadingId === s.id}
                    />
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <NewScheduleModal
        open={isModalOpen}
        students={students}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddSchedule}
      />

      {aiModalOpen && aiModalSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setAiModalOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Descrição da aula</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {aiModalSchedule.students?.name ?? 'Aluno'} ·{' '}
                  {new Date(aiModalSchedule.scheduled_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <button
                onClick={() => setAiModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                ×
              </button>
            </div>
            <div className="text-sm text-slate-700 whitespace-pre-line max-h-[320px] overflow-y-auto">
              {aiModalContent}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setAiModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
