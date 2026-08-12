import express from 'express';
import rateLimit from 'express-rate-limit';
import userRouter from './routes/userRouter.ts';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: { message: 'Too many requests, please try again later.' }
});

const app = express();

// Apply global rate limiting
app.use(limiter);

// Body parser with 20kb limit (placed BEFORE routes)
app.use(express.json({ limit: "20kb" }));

// Routes
app.use("/user", userRouter);
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

// 404 Handler
app.use((req, res) => {
  console.log(`Unhandled request: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: "Route not found" });
});

export default app;