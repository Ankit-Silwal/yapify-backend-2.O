import cookie from "cookie";
import { Server, Socket } from "socket.io";
import { checkUserInConversation,createMessage, getUserConversations, markMessageAsRead, updateMessageStatus } from "../services/chat.services.js";
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

  io.on("connection", async(socket: Socket) => {
    const userId=socket.data.userId;
    console.log("User connected:", socket.data.userId);
    socket.join(userId);
    const conversations=await getUserConversations(userId);
    conversations.forEach((row)=>{
      socket.join(row.conversation_id);
    })


   
    socket.on("send-message", async (data) => {
      try {
        const userId = socket.data.userId;
        const { conversationId, content } = data;

        const isMember = await checkUserInConversation(
          userId,
          conversationId
        );

        if (!isMember) {
          return socket.emit("error", "Unauthorized");
        }

        const message = await createMessage(
          conversationId,
          userId,
          content
        )
        io.to(conversationId).emit("new-message", message);

      } catch (error) {
        console.error("Message error:", error);
        socket.emit("error", "Message failed");
      }
    });

    socket.on("typing-start",(data)=>{
      const userId=socket.data.userId;
      const {conversationId}=data;

      socket.to(conversationId).emit("user-typing",{
        userId,
        conversationId
      })
    })

    socket.on("typing-stop",(data)=>{
      const userId=socket.data.userId;
      const {conversationId}=data;
      socket.to(conversationId).emit("user-stop-typing",{
        userId,
        conversationId
      })
    })

    socket.on("message-deliverd",async (data)=>{
      try {
        const userId = socket.data.userId;
        const { messageId, conversationId } = data;

        await updateMessageStatus(messageId, userId, "delivered");

        io.to(conversationId).emit("message-status-updated", {
          messageId,
          userId,
          status: "delivered"
        });
      } catch (error) {
        console.error("Delivery update error:", error);
      }
    });

    socket.on("messages-read",async(data)=>{
      try{
        const userId=socket.data.userId;
        const {conversationId,messageIds}=data;

        const isMember=await checkUserInConversation(
          userId,
          conversationId
        );
        if(!isMember){
          return;
        }

        await markMessageAsRead(messageIds,userId);

        socket.to(conversationId).emit("messages-read-update",{
          messageIds,
          userId
        })
      }catch(error){
        console.error("Read receipt error:",error);
      }
    })
  });
};
