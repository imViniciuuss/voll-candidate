import "dotenv/config";
import express, { Request, Response } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { stringify as csvStringify } from "csv-stringify/sync";
import PDFDocument from "pdfkit";
import { GoogleGenAI, Type } from "@google/genai";


const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });


interface StudentBody {
  name: string;
  email: string;
  phone: string;
  status: string;
  plan: string;
}

interface ScheduleBody {
  student_id: number;
  scheduled_at: string;
  duration_minutes: number;
  lesson_type: string;
  notes: string;
}

interface TransactionBody {
  type: string;
  description: string;
  amount: number;
  due_date: string;
  student_id?: number | null;
}

interface StatusBody {
  status: string;
}

interface ChatBody {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface ScheduleRow {
  id: number;
  scheduled_at: string;
  duration_minutes: number;
  lesson_type: string | null;
  notes: string | null;
  students: { name: string } | { name: string }[] | null;
}


function resolveStudent(students: ScheduleRow["students"]): { name: string } | null {
  if (!students) return null;
  return Array.isArray(students) ? (students[0] ?? null) : students;
}

function buildAiPrompt(schedule: ScheduleRow): string {
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

const CHAT_SYSTEM_INSTRUCTION = `Você é um assistente inteligente do sistema VOLL, plataforma de gerenciamento de studio de pilates.
Você tem acesso a ferramentas para consultar dados reais: alunos, agendamentos e transações financeiras.
Responda sempre em português brasileiro, de forma clara, objetiva e amigável.
Formate valores monetários como "R$ X,XX" e datas no formato brasileiro (dd/mm/aaaa).
Quando o usuário pedir dados do sistema, use as ferramentas disponíveis antes de responder.`.trim();

const CHAT_TOOLS = [
  {
    functionDeclarations: [
      {
        name: "get_students_count",
        description: "Retorna o total de alunos cadastrados no sistema, agrupados por status",
        parameters: { type: Type.OBJECT, properties: {} },
      },
      {
        name: "get_student_by_name",
        description: "Busca dados de um ou mais alunos pelo nome (busca parcial, sem distinção de maiúsculas)",
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Nome ou parte do nome do aluno" },
          },
          required: ["name"],
        },
      },
      {
        name: "get_student_by_id",
        description: "Busca dados de um aluno pelo ID numérico",
        parameters: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.NUMBER, description: "ID numérico do aluno" },
          },
          required: ["id"],
        },
      },
      {
        name: "list_upcoming_classes",
        description: 'Lista as próximas aulas com status "Agendado" a partir do momento atual',
        parameters: {
          type: Type.OBJECT,
          properties: {
            limit: { type: Type.NUMBER, description: "Número máximo de aulas a retornar (padrão: 10)" },
          },
        },
      },
      {
        name: "get_financial_summary",
        description: "Retorna resumo financeiro: total pendente a receber, a pagar e saldo realizado",
        parameters: { type: Type.OBJECT, properties: {} },
      },
    ],
  },
];

async function executeChatTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "get_students_count": {
      const { data } = await supabase.from("students").select("status");
      const total = data?.length ?? 0;
      const byStatus = (data ?? []).reduce((acc, s) => {
        acc[s.status] = (acc[s.status] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      return { total, byStatus };
    }
    case "get_student_by_name": {
      const { data } = await supabase
        .from("students")
        .select("id, name, email, phone, status, plan, created_at")
        .ilike("name", `%${args.name}%`);
      return data ?? [];
    }
    case "get_student_by_id": {
      const { data } = await supabase
        .from("students")
        .select("id, name, email, phone, status, plan, created_at")
        .eq("id", args.id)
        .single();
      return data ?? null;
    }
    case "list_upcoming_classes": {
      const limit = typeof args.limit === "number" ? args.limit : 10;
      const { data } = await supabase
        .from("schedules")
        .select("id, scheduled_at, duration_minutes, lesson_type, status, students(name)")
        .gte("scheduled_at", new Date().toISOString())
        .eq("status", "Agendado")
        .order("scheduled_at")
        .limit(limit);
      return data ?? [];
    }
    case "get_financial_summary": {
      const { data } = await supabase.from("transactions").select("type, amount, status");
      const rows = data ?? [];
      const toReceive = rows
        .filter(t => t.type === "receber" && t.status === "pendente")
        .reduce((sum, t) => sum + (t.amount ?? 0), 0);
      const toPay = rows
        .filter(t => t.type === "pagar" && t.status === "pendente")
        .reduce((sum, t) => sum + (t.amount ?? 0), 0);
      const realized = rows
        .filter(t => t.status === "pago")
        .reduce((sum, t) => sum + (t.type === "receber" ? t.amount : -t.amount), 0);
      return { toReceive, toPay, realized };
    }
    default:
      return { error: "Ferramenta não encontrada" };
  }
}


async function startServer(): Promise<void> {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Students
  app.get("/api/students", async (_req: Request, res: Response) => {
    const { data, error } = await supabase.from("students").select("*").order("name");
    if (error) return res.status(500).json(error);
    return res.json(data);
  });

  app.post("/api/students", async (req: Request<{}, {}, StudentBody>, res: Response) => {
    const { name, email, phone, status, plan } = req.body;
    const { data, error } = await supabase
      .from("students")
      .insert({ name, email, phone, status, plan })
      .select()
      .single();
    if (error) return res.status(500).json(error);
    return res.status(201).json(data);
  });

  app.delete("/api/students/:id", async (req: Request<{ id: string }>, res: Response) => {
    const { error } = await supabase.from("students").delete().eq("id", req.params.id);
    if (error) return res.status(500).json(error);
    return res.status(204).send();
  });

  // Students — Export
  app.get("/api/students/export/csv", async (_req: Request, res: Response) => {
    const { data, error } = await supabase
      .from("students")
      .select("name, email, phone, status, plan, created_at")
      .order("name");
    if (error) return res.status(500).json(error);

    const output = csvStringify([
      ["Nome", "Email", "Telefone", "Status", "Plano", "Cadastrado em"],
      ...data.map((s) => [
        s.name, s.email, s.phone, s.status, s.plan,
        new Date(s.created_at).toLocaleDateString("pt-BR"),
      ]),
    ]);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="alunos.csv"');
    return res.send("\uFEFF" + output);
  });

  app.get("/api/students/export/pdf", async (_req: Request, res: Response) => {
    const { data, error } = await supabase
      .from("students")
      .select("name, email, phone, status, plan, created_at")
      .order("name");
    if (error) return res.status(500).json(error);

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="alunos.pdf"');
    doc.pipe(res);

    const EMERALD = "#059669";
    const COLS = [
      { label: "Nome",     width: 155 },
      { label: "Email",    width: 145 },
      { label: "Telefone", width: 85  },
      { label: "Status",   width: 60  },
      { label: "Plano",    width: 50  },
    ];
    const TABLE_W = COLS.reduce((sum, c) => sum + c.width, 0);
    const LEFT = 50;
    const ROW_H = 22;

    doc.rect(LEFT, 50, TABLE_W, 52).fill(EMERALD);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(18)
      .text("VOLL — Lista de Alunos", LEFT, 62, { width: TABLE_W, align: "center" });

    doc.fillColor("#6b7280").font("Helvetica").fontSize(9)
      .text(
        `Gerado em ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}`,
        LEFT, 118, { width: TABLE_W, align: "right" }
      );

    doc.moveDown();
    let y = doc.y;

    doc.rect(LEFT, y, TABLE_W, ROW_H).fill("#f1f5f9");
    let x = LEFT;
    doc.fillColor("#475569").font("Helvetica-Bold").fontSize(9);
    COLS.forEach((col) => {
      doc.text(col.label, x + 6, y + 7, { width: col.width - 12 });
      x += col.width;
    });
    y += ROW_H;

    doc.font("Helvetica").fontSize(8).fillColor("#1e293b");
    data.forEach((student, i) => {
      if (y > 780) { doc.addPage(); y = 50; }
      if (i % 2 === 0) doc.rect(LEFT, y, TABLE_W, ROW_H).fill("#f8fafc");

      x = LEFT;
      [student.name, student.email, student.phone, student.status, student.plan].forEach((val, j) => {
        doc.fillColor("#1e293b").text(val ?? "", x + 6, y + 7, { width: COLS[j].width - 12, ellipsis: true });
        x += COLS[j].width;
      });

      doc.moveTo(LEFT, y + ROW_H).lineTo(LEFT + TABLE_W, y + ROW_H)
        .strokeColor("#e2e8f0").lineWidth(0.5).stroke();
      y += ROW_H;
    });

    doc.fillColor("#6b7280").fontSize(9)
      .text(`Total: ${data.length} aluno${data.length !== 1 ? "s" : ""}`, LEFT, y + 12);
    doc.end();
  });

  // Transactions
  app.get("/api/transactions", async (_req: Request, res: Response) => {
    const { data, error } = await supabase
      .from("transactions")
      .select("*, students(name)")
      .order("due_date");
    if (error) return res.status(500).json(error);
    return res.json(data);
  });

  app.post("/api/transactions", async (req: Request<{}, {}, TransactionBody>, res: Response) => {
    const { type, description, amount, due_date, student_id } = req.body;
    const { data, error } = await supabase
      .from("transactions")
      .insert({ type, description, amount, due_date, student_id: student_id ?? null, status: "pendente" })
      .select("*, students(name)")
      .single();
    if (error) return res.status(500).json(error);
    return res.status(201).json(data);
  });

  app.patch("/api/transactions/:id", async (req: Request<{ id: string }, {}, StatusBody>, res: Response) => {
    const { status } = req.body;
    const { data, error } = await supabase
      .from("transactions")
      .update({ status })
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json(error);
    return res.json(data);
  });

  app.delete("/api/transactions/:id", async (req: Request<{ id: string }>, res: Response) => {
    const { error } = await supabase.from("transactions").delete().eq("id", req.params.id);
    if (error) return res.status(500).json(error);
    return res.status(204).send();
  });

  // Schedules
  app.get("/api/schedules", async (req: Request, res: Response) => {
    let query = supabase
      .from("schedules")
      .select("*, students(name)")
      .order("scheduled_at");

    if (req.query.from) query = query.gte("scheduled_at", req.query.from as string);
    if (req.query.to)   query = query.lte("scheduled_at", req.query.to   as string);

    const { data, error } = await query;
    if (error) return res.status(500).json(error);
    return res.json(data);
  });

  app.post("/api/schedules", async (req: Request<{}, {}, ScheduleBody>, res: Response) => {
    const { student_id, scheduled_at, duration_minutes, lesson_type, notes } = req.body;
    const { data, error } = await supabase
      .from("schedules")
      .insert({ student_id, scheduled_at, duration_minutes, lesson_type, notes, status: "Agendado" })
      .select("*, students(name)")
      .single();
    if (error) return res.status(500).json(error);
    return res.status(201).json(data);
  });

  app.patch("/api/schedules/:id", async (req: Request<{ id: string }, {}, StatusBody>, res: Response) => {
    const { status } = req.body;
    const { data, error } = await supabase
      .from("schedules")
      .update({ status })
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json(error);
    return res.json(data);
  });

  app.post("/api/schedules/:id/ai-description", async (req: Request<{ id: string }>, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido." });
    }

    try {
      const { data: schedule, error: scheduleError } = await supabase
        .from("schedules")
        .select("id, scheduled_at, duration_minutes, lesson_type, notes, students(name)")
        .eq("id", id)
        .single<ScheduleRow>();

      if (scheduleError) return res.status(500).json(scheduleError);
      if (!schedule)     return res.status(404).json({ error: "Aula não encontrada." });

      const result = await genai.models.generateContent({
        model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: buildAiPrompt(schedule) }] }],
      });

      const description = result.text?.trim() ?? "";
      if (!description) return res.status(502).json({ error: "Resposta vazia do modelo." });

      supabase
        .from("schedules")
        .update({ ai_description: description, ai_description_updated_at: new Date().toISOString() })
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.warn("[ai-description] Falha ao salvar no banco:", error.message);
        });

      return res.json({ ai_description: description });
    } catch (err) {
      console.error("[ai-description]", err);
      return res.status(500).json({ error: "Erro ao gerar descrição com IA." });
    }
  });

  // AI Chat
  app.post("/api/ai/chat", async (req: Request<{}, {}, ChatBody>, res: Response) => {
    const { message, history } = req.body;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contents: any[] = [
        ...(history ?? []).map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        { role: "user", parts: [{ text: message }] },
      ];

      let response = await genai.models.generateContent({
        model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
        contents,
        config: {
          systemInstruction: CHAT_SYSTEM_INSTRUCTION,
          tools: CHAT_TOOLS,
        },
      });

      while (response.functionCalls && response.functionCalls.length > 0) {
        const modelParts = response.candidates?.[0]?.content?.parts ?? [];
        contents.push({ role: "model", parts: modelParts });

        const functionResponseParts = await Promise.all(
          response.functionCalls.map(async fc => {
            const result = await executeChatTool(fc.name ?? "", (fc.args ?? {}) as Record<string, unknown>);
            return {
              functionResponse: {
                name: fc.name ?? "",
                response: { result },
              },
            };
          })
        );

        contents.push({ role: "user", parts: functionResponseParts });

        response = await genai.models.generateContent({
          model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
          contents,
          config: {
            systemInstruction: CHAT_SYSTEM_INSTRUCTION,
            tools: CHAT_TOOLS,
          },
        });
      }

      return res.json({ response: response.text?.trim() ?? "Não consegui gerar uma resposta." });
    } catch (err) {
      console.error("[ai/chat]", err);
      return res.status(500).json({ error: "Erro ao processar sua mensagem." });
    }
  });

  // Vite / static
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`VOLL Candidate running on http://localhost:${PORT}`);
  });
}

startServer();
