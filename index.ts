import app from "./app.js";
import { createServer } from "node:http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { registerSocketHandlers } from "./src/socket/socket.js";

dotenv.config();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});
registerSocketHandlers(io);
const port = process.env.PORT || 3000;
httpServer.listen(port, () => {
  console.log(`Server running at port ${port}`);
});
