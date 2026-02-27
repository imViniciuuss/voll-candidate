import { Router, Request, Response } from "express";
import { stringify as csvStringify } from "csv-stringify/sync";
import PDFDocument from "pdfkit";
import { supabase } from "../clients.js";
import type { StudentBody } from "../types.js";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const { data, error } = await supabase.from("students").select("*").order("name");
  if (error) return res.status(500).json(error);
  return res.json(data);
});

router.post("/", async (req: Request<{}, {}, StudentBody>, res: Response) => {
  const { name, email, phone, status, plan } = req.body;
  const { data, error } = await supabase
    .from("students")
    .insert({ name, email, phone, status, plan })
    .select()
    .single();
  if (error) return res.status(500).json(error);
  return res.status(201).json(data);
});

router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const { error } = await supabase.from("students").delete().eq("id", req.params.id);
  if (error) return res.status(500).json(error);
  return res.status(204).send();
});

router.get("/export/csv", async (_req: Request, res: Response) => {
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

router.get("/export/pdf", async (_req: Request, res: Response) => {
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

export default router;
