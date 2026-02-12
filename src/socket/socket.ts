import jwt from "jsonwebtoken";
import { Server, Socket } from "socket.io";

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
    console.log("User connected:", socket.data.userId);

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.data.userId);
    });
  });
};
