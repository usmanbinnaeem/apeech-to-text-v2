import WebSocket from "ws";
import { google } from "@google-cloud/speech/build/protos/protos";
import { processAudioData } from "./audioProcessor";
import logger from "../utils/logs";

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
      logger.log("Received audio data");
      try {
        const message = {
          type: "transcriber-response",
          transcription: "Hæ Róbert, gaman að heyra frá þér",
          channel: "customer",
        };
        ws.send(JSON.stringify(message));
        // audioBuffer = Buffer.concat([audioBuffer, message as Buffer]);
        // logger.log(`Audio buffer length: ${audioBuffer.length}`);
        // if (audioBuffer.length > 0) {
        //   isProcessing = true;
        //   logger.log("Processing audio buffer");
        //   try {
        //     await processAndSendTranscription(ws, audioBuffer, sampleRate, channels);
        //     logger.log("Audio buffer processed");
        //   } catch (error) {
        //     logger.error(`Error in processAndSendTranscription: ${error}`);
        //   } finally {
        //     audioBuffer = Buffer.alloc(0);
        //     isProcessing = false;
        //   }
        // }
      } catch (error) {
        logger.error(`Error processing audio buffer:, ${error}`);
        console.error("Error processing audio buffer:", error);
        sendErrorResponse(ws, "Error processing audio buffer");
      }
    } else {
      try {
        const jsonMessage = JSON.parse(message.toString()) as StartMessage;
        if (jsonMessage.type === "start") {
          sampleRate = jsonMessage.sampleRate;
          channels = jsonMessage.channels;
          logger.log("Received start message");
        }
      } catch (error) {
        logger.error(`Error parsing JSON message:, ${error}`);
        console.error("Error parsing JSON message:", error);
        sendErrorResponse(ws, "Invalid JSON message");
      }
    }
  });

  ws.on("close", () => {
    logger.log("WebSocket client disconnected");
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
    logger.log("Processing audio");
    const transcription = await processAudioData(buffer, sampleRate, channels);
    logger.log("Sending transcription response");
    sendTranscriptionResponse(ws, transcription);
  } catch (error) {
    logger.error(`Error processing audio:, ${error}`);
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
          type: "transcriber-response",
          transcription: transcript,
          channel: "customer",
        };
        ws.send(JSON.stringify(message));
      }
    });
  }
};

const sendErrorResponse = (ws: WebSocket, errorMessage: string) => {
  if (ws.readyState === WebSocket.OPEN) {
    const message = {
      type: "error",
      error: errorMessage,
    };
    ws.send(JSON.stringify(message));
    logger.error(`Sent error response:, ${message}`);
    console.error("Sent error response:", message);
  }
};
