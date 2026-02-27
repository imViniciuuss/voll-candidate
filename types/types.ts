export type ScheduleStatus = 'Agendado' | 'Concluido' | 'Cancelado';

export interface Schedule {
  id: number;
  student_id: number;
  scheduled_at: string;
  duration_minutes: number;
  lesson_type: string | null;
  status: ScheduleStatus;
  notes: string | null;
  ai_description?: string | null;
  students: { name: string } | null;
}

export interface Student {
  id: number;
  name: string;
}

export type FilterType = 'hoje' | 'semana' | 'todos';
