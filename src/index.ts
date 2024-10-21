import express from "express";
import http from "http";
import WebSocket from "ws";
import dotenv from "dotenv";
import { handleConnection } from "./websocket/connectionHandler";

dotenv.config();
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: "/transcribe", });

wss.on("connection", (ws) => {
  handleConnection(ws);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});