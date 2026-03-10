import express from "express";
import studentsRouter     from "./routes/students.js";
import schedulesRouter    from "./routes/schedules.js";
import transactionsRouter from "./routes/transactions.js";
import chatRouter         from "./routes/chat.js";

const app = express();

const allowedOrigin = process.env.FRONTEND_ORIGIN ?? "https://voll-candidate.vercel.app";

app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (_req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());
app.use("/api/students",     studentsRouter);
app.use("/api/schedules",    schedulesRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/ai",           chatRouter);

export default app;
