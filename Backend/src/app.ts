import express from 'express';
import cors from 'cors';
import { globalLimiter } from './middlewares/rateLimiters.ts';
import userRouter from './routes/userRouter.ts';
import studentRouter from './routes/studentRouter.ts';
import teacherRouter from './routes/teacherRouter.ts';
import videoRouter from './routes/videoRouter.ts';
import errorHandler from './middlewares/errorMiddleware.ts';

const app = express();

// Trust the first proxy hop so rate limiting keys on the real client IP
// rather than the load balancer's.
app.set('trust proxy', 1);

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  // With no allowlist configured, reflect the request origin so local and
  // native clients work out of the box. Set CORS_ORIGINS in production.
  origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  credentials: true
}));

// Apply global rate limiting
app.use(globalLimiter);

// Body parsers with 20kb limit (placed BEFORE routes)
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));

// Routes
// The strict limiter is applied per-route inside userRouter so it guards the
// credential endpoints without throttling authenticated profile reads.
app.use("/user", userRouter);
app.use("/student", studentRouter);
app.use("/teacher", teacherRouter);
app.use("/videos", videoRouter);
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

// 404 Handler
app.use((req, res) => {
  console.log(`Unhandled request: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: "Route not found" });
});

// Error handler must be mounted last so it sees errors from every route above.
app.use(errorHandler);

export default app;
