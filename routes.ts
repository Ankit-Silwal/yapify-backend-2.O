import { Application } from "express"
import authRoutes from "./src/models/auth/authRoutes.js"

export const setUpRoutes=(app:Application)=>{
  app.use('/api/auth',authRoutes);
}