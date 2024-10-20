import dotenv from "dotenv";
import express from "express";
import http from "http";
import WebSocket from "ws";
import { config } from "./config/index";
import { handleConnection } from "./websocket/connectionHandler";

dotenv.config();
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const server = http.createServer(app);
const wss = new WebSocket.Server({
  server: server,
  path: "/transcribe",
});

wss.on("connection", (ws, req) => {
  handleConnection(ws, req);
});

const PORT = config.port || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(
    `WebSocket server is available at ws://${config.domain}:${PORT}/transcribe`
  );
});
