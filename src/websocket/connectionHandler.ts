import WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";
import { handleMessage } from "./messageHandler";

export const handleConnection = (ws: WebSocket, req: any) => {
  const sessionId = uuidv4();

  ws.send(
    JSON.stringify({
      event: "connection",
      sessionId: sessionId,
    })
  );

  ws.on("message", async (message: string) => {
    try {
      await handleMessage(ws, message, sessionId);
    } catch (error) {
      console.error("Error handling message:", error);
      ws.send(
        JSON.stringify({
          event: "error",
          message: "Error handling message",
          details: error instanceof Error ? error.message : "Unknown error",
          sessionId: sessionId,
        })
      );
    }
  });

  ws.on("close", () => {
    console.log(`WebSocket connection closed for session ${sessionId}`);
    // Any cleanup operations can be performed here if needed
  });
};