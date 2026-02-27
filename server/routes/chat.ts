import { Router, Request, Response } from "express";
import { Type } from "@google/genai";
import { supabase, genai, GEMINI_MODEL } from "../clients.js";
import type { ChatBody } from "../types.js";

const router = Router();

const SYSTEM_INSTRUCTION = `
Você é um assistente inteligente do sistema VOLL, plataforma de gerenciamento de studio de pilates.
Você tem acesso a ferramentas para consultar dados reais: alunos, agendamentos e transações financeiras.
Responda sempre em português brasileiro, de forma clara, objetiva e amigável.
Formate valores monetários como "R$ X,XX" e datas no formato brasileiro (dd/mm/aaaa).
Quando o usuário pedir dados do sistema, use as ferramentas disponíveis antes de responder.
`.trim();

const TOOLS = [
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

async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
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

router.post("/chat", async (req: Request<{}, {}, ChatBody>, res: Response) => {
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
      model: GEMINI_MODEL,
      contents,
      config: { systemInstruction: SYSTEM_INSTRUCTION, tools: TOOLS },
    });

    while (response.functionCalls && response.functionCalls.length > 0) {
      const modelParts = response.candidates?.[0]?.content?.parts ?? [];
      contents.push({ role: "model", parts: modelParts });

      const functionResponseParts = await Promise.all(
        response.functionCalls.map(async fc => {
          const result = await executeTool(fc.name ?? "", (fc.args ?? {}) as Record<string, unknown>);
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
        model: GEMINI_MODEL,
        contents,
        config: { systemInstruction: SYSTEM_INSTRUCTION, tools: TOOLS },
      });
    }

    return res.json({ response: response.text?.trim() ?? "Não consegui gerar uma resposta." });
  } catch (err) {
    console.error("[ai/chat]", err);
    return res.status(500).json({ error: "Erro ao processar sua mensagem." });
  }
});

export default router;
