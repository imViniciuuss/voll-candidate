import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import studentsRouter     from "./routes/students.js";
import schedulesRouter    from "./routes/schedules.js";
import transactionsRouter from "./routes/transactions.js";
import chatRouter         from "./routes/chat.js";

async function startServer(): Promise<void> {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.use("/api/students",     studentsRouter);
  app.use("/api/schedules",    schedulesRouter);
  app.use("/api/transactions", transactionsRouter);
  app.use("/api/ai",           chatRouter);

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
