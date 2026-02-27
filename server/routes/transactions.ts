import { Router, Request, Response } from "express";
import { supabase } from "../clients.js";
import type { TransactionBody, StatusBody } from "../types.js";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("transactions")
    .select("*, students(name)")
    .order("due_date");
  if (error) return res.status(500).json(error);
  return res.json(data);
});

router.post("/", async (req: Request<{}, {}, TransactionBody>, res: Response) => {
  const { type, description, amount, due_date, student_id } = req.body;
  const { data, error } = await supabase
    .from("transactions")
    .insert({ type, description, amount, due_date, student_id: student_id ?? null, status: "pendente" })
    .select("*, students(name)")
    .single();
  if (error) return res.status(500).json(error);
  return res.status(201).json(data);
});

router.patch("/:id", async (req: Request<{ id: string }, {}, StatusBody>, res: Response) => {
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

router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const { error } = await supabase.from("transactions").delete().eq("id", req.params.id);
  if (error) return res.status(500).json(error);
  return res.status(204).send();
});

export default router;
