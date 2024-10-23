import express from "express";
import http from "http";
import WebSocket from "ws";
import dotenv from "dotenv";
import { handleConnection } from "./websocket/connectionHandler";
import { config } from "./config";
// import logger from "./utils/logs";

dotenv.config();
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: "/transcribe", });

wss.on("connection", (ws, req) => {
  // Verify VAPI secret
  // const vapiSecret = req.headers['x-vapi-secret'];
  // if (vapiSecret !== config.vapiSecret) {
  //   logger.warn("Invalid VAPI secret");
  //   ws.close(1008, "Invalid VAPI secret");
  //   return;
  // }
  console.log("WebSocket client connected");
  handleConnection(ws);
});

const PORT = config.port || 3001;
server.listen(PORT, () => {
  // console.log(`Server is running on port ${PORT}`);
  console.info(`Server is running on port ${PORT}`);
});