import { Application } from "express"
import authRoutes from "./src/models/auth/authRoutes.js"
import conversationRoutes from "./src/services/conversation.routes.js";
import userRoutes from "./src/models/users/userRoutes.js";

export const setUpRoutes=(app:Application)=>{
  app.use('/api/auth',authRoutes);
  app.use('/api/conversation',conversationRoutes);
  app.use('/api', userRoutes);
}