import WebSocket from "ws";
import { google } from "@google-cloud/speech/build/protos/protos";
import { processAudioData } from "./audioProcessor";

interface StartMessage {
  type: "start";
  encoding: string;
  container: string;
  sampleRate: number;
  channels: number;
}

export const handleConnection = (ws: WebSocket) => {
  let audioBuffer = Buffer.alloc(0);
  let sampleRate: number;
  let channels: number;
  let isProcessing = false;

  ws.on("message", async (message: WebSocket.Data, isBinary: boolean) => {
    if (isBinary) {
      audioBuffer = Buffer.concat([audioBuffer, message as Buffer]);

      if (!isProcessing && audioBuffer.length > 0) {
        isProcessing = true;
        await processAndSendTranscription(
          ws,
          audioBuffer,
          sampleRate,
          channels
        );
        audioBuffer = Buffer.alloc(0);
        isProcessing = false;
      }
    } else {
      try {
        const jsonMessage = JSON.parse(message.toString()) as StartMessage;
        if (jsonMessage.type === "start") {
          sampleRate = jsonMessage.sampleRate;
          channels = jsonMessage.channels;
        }
      } catch (error) {
        console.error("Error parsing JSON message:", error);
        sendErrorResponse(ws, "Invalid JSON message");
      }
    }
  });

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
  });
};

const processAndSendTranscription = async (
  ws: WebSocket,
  buffer: Buffer,
  sampleRate: number,
  channels: number
) => {
  try {
    const transcription = await processAudioData(buffer, sampleRate, channels);
    sendTranscriptionResponse(ws, transcription);
  } catch (error) {
    console.error("Error processing audio:", error);
    sendErrorResponse(ws, "Error processing audio");
  }
};

const sendTranscriptionResponse = (
  ws: WebSocket,
  response: google.cloud.speech.v2.IRecognizeResponse
) => {
  if (ws.readyState === WebSocket.OPEN) {
    response.results?.forEach((result) => {
      if (result.alternatives && result.alternatives[0]) {
        const transcript = result.alternatives[0].transcript;
        const message = {
          "type": "transcriber-response",
          "transcription": transcript,
          "channel": "customer",
        };
        ws.send(JSON.stringify(message));
      }
    });
  }
};

const sendErrorResponse = (ws: WebSocket, errorMessage: string) => {
  if (ws.readyState === WebSocket.OPEN) {
    const message = {
      "type": "error",
      "error": errorMessage,
    };
    ws.send(JSON.stringify(message));
    console.error("Sent error response:", message);
  }
};
