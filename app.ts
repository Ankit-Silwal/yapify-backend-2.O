import express from "express";
import cookieParser from "cookie-parser";
import { connectDB } from "./src/config/db.js";
const app=express();
app.use(express.json())
app.use(cookieParser());
connectDB();
app.get('/health',(req,res)=>{
 res.json({
  success:true,
  health:"fit as fuck sir"
 })
})

export default app;

