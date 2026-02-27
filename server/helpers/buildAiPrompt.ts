import type { ScheduleRow } from "../types.js";

function resolveStudent(students: ScheduleRow["students"]): { name: string } | null {
  if (!students) return null;
  return Array.isArray(students) ? (students[0] ?? null) : students;
}

export function buildAiPrompt(schedule: ScheduleRow): string {
  const studentName = resolveStudent(schedule.students)?.name ?? "Aluno";
  const dt = new Date(schedule.scheduled_at);
  const date = dt.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const time = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const lessonType = schedule.lesson_type ?? "Individual";
  const duration = schedule.duration_minutes;
  const notes = schedule.notes;

  return `
Você é um instrutor de pilates experiente e comunicativo.
Escreva uma mensagem personalizada para enviar ao aluno sobre a aula agendada.
Tom: acolhedor, motivador e profissional. Idioma: português brasileiro.
Não faça diagnóstico médico, não prometa cura nem resultados específicos.

Informações da aula:
- Aluno: ${studentName}
- Data: ${date} às ${time}
- Modalidade: ${lessonType}
- Duração: ${duration} minutos
${notes ? `- Observações do instrutor: ${notes}` : ""}

Estrutura esperada (3 parágrafos em texto corrido, sem bullet points, sem markdown):
1. Saudação pelo nome e confirmação amigável da aula
2. O que será trabalhado na sessão e o objetivo principal do encontro
3. Uma dica prática de preparação (hidratação, roupa confortável, chegar alguns minutos antes etc.) e uma frase de incentivo final
`.trim();
}
