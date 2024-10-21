import WebSocket from "ws";
import { processAudioData } from "./audioProcessor";

export const handleConnection = (ws: WebSocket) => {
  let pcmBuffer = Buffer.alloc(0);
  let sampleRate: number;

  ws.on("message", async (message: WebSocket.Data, isBinary: boolean) => {
    if (isBinary) {
      pcmBuffer = Buffer.concat([pcmBuffer, message as Buffer]);
      if (pcmBuffer.length >= 32000) {
        const transcription = await processAudioData(pcmBuffer, sampleRate);
        sendTranscriptionResponse(ws, transcription);
        pcmBuffer = Buffer.alloc(0);
      }
    } else {
      try {
        const jsonMessage = JSON.parse(message.toString());
        if (jsonMessage.type === "start") {
          sampleRate = jsonMessage.sampleRate;
        }
      } catch (error) {
        console.error("Error parsing JSON message:", error);
      }
    }
  });

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
  });
};

const sendTranscriptionResponse = (ws: WebSocket, transcription: string) => {
  if (ws.readyState === WebSocket.OPEN) {
    const message = {
      type: "transcriber-response",
      transcription: transcription,
      channel: "customer", // Assuming all incoming audio is from customer
    };
    ws.send(JSON.stringify(message));
    console.log("Sent transcription response:", message);
  }
};
