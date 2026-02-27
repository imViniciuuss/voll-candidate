import express from "express";
import studentsRouter     from "./routes/students.js";
import schedulesRouter    from "./routes/schedules.js";
import transactionsRouter from "./routes/transactions.js";
import chatRouter         from "./routes/chat.js";

const app = express();

app.use(express.json());
app.use("/api/students",     studentsRouter);
app.use("/api/schedules",    schedulesRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/ai",           chatRouter);

export default app;
