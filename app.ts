import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { connectDB } from "./src/config/db.js";
import { setUpRoutes } from "./routes.js";
import { initRedis } from "./src/config/redis.js";

const app=express();

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials:true
}))
app.use(express.json())
app.use(cookieParser());
connectDB();
initRedis();
setUpRoutes(app);
app.get('/health',(req,res)=>{
 res.json({
  success:true,
  health:"fit as fuck sir"
 })
})

export default app;

