import express,{json} from 'express'
import userRouter from './routes/userRouter.ts'
const app = express()
app.use(express.json()); 
app.use("/user", userRouter);
app.use(json({ limit: "20kb" }));
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));
app.use((req, res, next) => {
  console.log(`Unhandled request: ${req.method} ${req.originalUrl}`);
  res.status(404).send("Route not found");
});
export default app;