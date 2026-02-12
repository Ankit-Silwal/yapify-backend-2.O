import jwt from "jsonwebtoken";
import { Server, Socket } from "socket.io";
import { checkUserInConversation,createMessage } from "../services/chat.services.js";
export const registerSocketHandlers = (io: Server) => {

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Unauthorized"));
    }
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET as string
      ) as { id: string };

      socket.data.userId = decoded.id;
      next();
    } catch (error: any) {
      console.error("Socket authentication error:", error.message);
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId=socket.data.userId;
    console.log("User connected:", socket.data.userId);
    socket.join(userId);


    socket.on("send-message",async (data)=>{
      const userId=socket.data.userId;
      const {conversationId,content}=data;

      const isMember=await checkUserInConversation(userId,conversationId);
      if(!isMember){
        return socket.emit("error","Unauthorized");
      }
      const message=await createMessage(conversationId, userId, content);
      io.to(conversationId).emit("new-message",message);
    })
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.data.userId);
    });
  });
};
