import { Router, Request, Response } from "express";
import { supabase, genai, GEMINI_MODEL } from "../clients.js";
import { buildAiPrompt } from "../helpers/buildAiPrompt.js";
import type { ScheduleBody, StatusBody, ScheduleRow } from "../types.js";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
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

router.post("/", async (req: Request<{}, {}, ScheduleBody>, res: Response) => {
  const { student_id, scheduled_at, duration_minutes, lesson_type, notes } = req.body;
  const { data, error } = await supabase
    .from("schedules")
    .insert({ student_id, scheduled_at, duration_minutes, lesson_type, notes, status: "Agendado" })
    .select("*, students(name)")
    .single();
  if (error) return res.status(500).json(error);
  return res.status(201).json(data);
});

router.patch("/:id", async (req: Request<{ id: string }, {}, StatusBody>, res: Response) => {
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

router.post("/:id/ai-description", async (req: Request<{ id: string }>, res: Response) => {
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
      model: GEMINI_MODEL,
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

export default router;
