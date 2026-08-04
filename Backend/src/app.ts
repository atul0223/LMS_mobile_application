import express,{json} from 'express'
import userRouter from './routes/userRouter.ts'
const app = express()
app.use(express.json()); 
app.use("/user", userRouter);
app.use(json({ limit: "20kb" }));
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));
export default app;