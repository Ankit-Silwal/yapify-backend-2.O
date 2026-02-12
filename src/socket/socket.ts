import cookie from "cookie";
import { Server, Socket } from "socket.io";
import { checkUserInConversation,createMessage } from "../services/chat.services.js";
import { getSession } from "../models/auth/sessionManager.js";
export const registerSocketHandlers = (io: Server) => {

  io.use(async (socket: Socket, next) => {
    const cookieHeader=socket.handshake.headers.cookie;
    if(!cookieHeader){
      return next(new Error("No cookie found"));
    }
    const cookies=cookie.parse(cookieHeader);
    const sessionId=cookies.sessionId;
    if(!sessionId){
      return next(new Error("Unauthorized"));
    }
    const session=await getSession(sessionId);
    if(!session){
      return next(new Error("Invalid Session"));
    }
    socket.data.userId=session.userId;
    next();
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
