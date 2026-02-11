import express from "express";
import cookieParser from "cookie-parser";

const app=express();
app.use(express.json())
app.use(cookieParser());
app.get('/health',(req,res)=>{
 res.json({
  success:true,
  health:"fit as fuck sir"
 })
})

export default app;

