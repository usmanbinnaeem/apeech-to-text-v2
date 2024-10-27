import WebSocket from "ws";
import { google } from "@google-cloud/speech/build/protos/protos";
import { processAudioStream } from "./audioProcessor";
import logger from "../utils/logs";

interface StartMessage {
  type: "start";
  encoding: string;
  container: string;
  sampleRate: number;
  channels: number;
}

// Calculate buffer sizes based on audio properties
const BYTES_PER_SAMPLE = 2; // 16-bit audio = 2 bytes
const DEFAULT_SAMPLE_RATE = 16000;
const DEFAULT_CHANNELS = 2;

// Buffer for 500ms of audio by default
const calculateChunkSize = (sampleRate: number, channels: number) => 
  Math.floor((sampleRate * BYTES_PER_SAMPLE * channels * 0.5));

export const handleConnection = (ws: WebSocket) => {
  let audioBuffer = Buffer.alloc(0);
  let sampleRate = DEFAULT_SAMPLE_RATE;
  let channels = DEFAULT_CHANNELS;
  let isProcessing = false;
  let streamEnded = false;
  let chunkSize: number;
  let maxBufferSize: number;

  const initializeBufferSizes = (sRate: number, ch: number) => {
    chunkSize = calculateChunkSize(sRate, ch);
    maxBufferSize = chunkSize * 4; // Store up to 2 seconds of audio
    logger.log(`Initialized with chunk size: ${chunkSize}, max buffer: ${maxBufferSize}`);
  };

  const processChunk = async () => {
    if (isProcessing || audioBuffer.length < chunkSize) {
      return;
    }

    try {
      isProcessing = true;
      const chunkToProcess = audioBuffer.slice(0, chunkSize);
      audioBuffer = audioBuffer.slice(chunkSize);

      logger.log(`Processing chunk of size: ${chunkToProcess.length} bytes`);
      await processAndSendTranscription(ws, chunkToProcess, sampleRate, channels);
    } catch (error) {
      logger.error(`Error processing chunk: ${error}`);
      sendErrorResponse(ws, "Error processing audio chunk");
    } finally {
      isProcessing = false;
      
      // Process next chunk if available
      if (audioBuffer.length >= chunkSize) {
        setImmediate(processChunk);
      } else if (streamEnded && audioBuffer.length > 0) {
        // Process remaining buffer if stream ended
        setImmediate(processChunk);
      }
    }
  };

  const handleAudioData = async (data: Buffer) => {
    audioBuffer = Buffer.concat([audioBuffer, data]);
    
    if (audioBuffer.length > maxBufferSize) {
      const exceeded = audioBuffer.length - maxBufferSize;
      logger.log(`Buffer exceeded by ${exceeded} bytes. Processing chunks to catch up.`);
      
      // Process multiple chunks to catch up
      while (audioBuffer.length >= chunkSize && !isProcessing) {
        await processChunk();
      }
    } else if (audioBuffer.length >= chunkSize) {
      await processChunk();
    }
  };

  ws.on("message", async (message: WebSocket.Data, isBinary: boolean) => {
    if (isBinary) {
      try {
        await handleAudioData(message as Buffer);
      } catch (error) {
        logger.error(`Error handling audio data: ${error}`);
        sendErrorResponse(ws, "Error processing audio buffer");
      }
    } else {
      try {
        const jsonMessage = JSON.parse(message.toString());
        if (jsonMessage.type === "start") {
          const startMessage = jsonMessage as StartMessage;
          sampleRate = startMessage.sampleRate;
          channels = startMessage.channels;
          initializeBufferSizes(sampleRate, channels);
          logger.log(`Received start message: ${startMessage}`);
        } else if (jsonMessage.type === "end") {
          streamEnded = true;
          // Process any remaining audio in buffer
          if (audioBuffer.length > 0) {
            await processChunk();
          }
        }
      } catch (error) {
        logger.error(`Error parsing JSON message: ${error}`);
        sendErrorResponse(ws, "Invalid JSON message");
      }
    }
  });

  ws.on("close", () => {
    logger.log("WebSocket client disconnected");
    streamEnded = true;
  });
};

const processAndSendTranscription = async (
  ws: WebSocket,
  buffer: Buffer,
  sampleRate: number,
  channels: number
) => {
  try {
    const transcription = await processAudioStream(
      buffer,
      sampleRate,
      channels
    );
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
