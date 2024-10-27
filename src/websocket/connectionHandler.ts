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

const MIN_AUDIO_DURATION_MS = 5000; // Minimum duration of audio to process (e.g., 5 seconds)
const BYTES_PER_SAMPLE = 2; // 16-bit PCM, so 2 bytes per sample

export const handleConnection = (ws: WebSocket) => {
  let audioBuffer = Buffer.alloc(0);
  let sampleRate: number = 16000; // Default sample rate, can be overridden by start message
  let channels: number = 1; // Default channels, can be overridden by start message

  ws.on("message", async (message: WebSocket.Data, isBinary: boolean) => {
    if (isBinary) {
      // Append the binary audio data to the buffer
      audioBuffer = Buffer.concat([audioBuffer, message as Buffer]);

      // Calculate the duration of the audio buffer
      const durationMs =
        (audioBuffer.length / (sampleRate * channels * BYTES_PER_SAMPLE)) * 1000;

      logger.log(`Audio buffer duration: ${durationMs.toFixed(2)} ms`);

      // If the buffer has accumulated enough audio, process it
      if (durationMs >= MIN_AUDIO_DURATION_MS) {
        logger.log("Minimum audio duration reached. Processing audio buffer.");
        try {
          await processAndSendTranscription(ws, audioBuffer, sampleRate, channels);
          logger.log("Audio buffer processed");
        } catch (error) {
          logger.error(`Error in processAndSendTranscription: ${error}`);
        } finally {
          // Reset the audio buffer after processing
          audioBuffer = Buffer.alloc(0);
        }
      }
    } else {
      // Handle text messages (e.g., start message)
      try {
        const jsonMessage = JSON.parse(message.toString()) as StartMessage;
        if (jsonMessage.type === "start") {
          sampleRate = jsonMessage.sampleRate;
          channels = jsonMessage.channels;
        }
      } catch (error) {
        logger.error(`Error parsing JSON message: ${error}`);
        sendErrorResponse(ws, "Invalid JSON message");
      }
    }
  });

  ws.on("close", () => {
    logger.log("WebSocket client disconnected");
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
    logger.error(`Error processing audio: ${error}`);
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
    logger.error(`Sent error response: ${message}`);
  }
};
