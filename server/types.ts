export interface StudentBody {
  name: string;
  email: string;
  phone: string;
  status: string;
  plan: string;
}

export interface ScheduleBody {
  student_id: number;
  scheduled_at: string;
  duration_minutes: number;
  lesson_type: string;
  notes: string;
}

export interface TransactionBody {
  type: string;
  description: string;
  amount: number;
  due_date: string;
  student_id?: number | null;
}

export interface StatusBody {
  status: string;
}

export interface ChatBody {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface ScheduleRow {
  id: number;
  scheduled_at: string;
  duration_minutes: number;
  lesson_type: string | null;
  notes: string | null;
  students: { name: string } | { name: string }[] | null;
}
