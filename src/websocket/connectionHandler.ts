// import WebSocket from "ws";
// import { google } from "@google-cloud/speech/build/protos/protos";
// import { processAudioData } from "./audioProcessor";
// import console from "../utils/logs";

// interface StartMessage {
//   type: "start";
//   encoding: string;
//   container: string;
//   sampleRate: number;
//   channels: number;
// }

// export const handleConnection = (ws: WebSocket) => {
//   let audioBuffer = Buffer.alloc(0);
//   let sampleRate: number;
//   let channels: number;
//   let isProcessing = false;

//   ws.on("message", async (message: WebSocket.Data, isBinary: boolean) => {
//     if (isBinary) {
//       console.log("Received audio data");
//       try {
//         audioBuffer = Buffer.concat([audioBuffer, message as Buffer]);
//         console.log(`Audio buffer length: ${audioBuffer.length}`);
//         if (audioBuffer.length > 0) {
//           isProcessing = true;
//           console.log("Processing audio buffer");
//           try {
//             await processAndSendTranscription(ws, audioBuffer, sampleRate, channels);
//             console.log("Audio buffer processed");
//           } catch (error) {
//             console.error(`Error in processAndSendTranscription: ${error}`);
//           } finally {
//             audioBuffer = Buffer.alloc(0);
//             isProcessing = false;
//           }
//         }
//       } catch (error) {
//         console.error(`Error processing audio buffer:, ${error}`);
//         console.error("Error processing audio buffer:", error);
//         sendErrorResponse(ws, "Error processing audio buffer");
//       }
//     } else {
//       try {
//         const jsonMessage = JSON.parse(message.toString()) as StartMessage;
//         if (jsonMessage.type === "start") {
//           sampleRate = jsonMessage.sampleRate;
//           channels = jsonMessage.channels;
//           console.log("Received start message");
//         }
//       } catch (error) {
//         console.error(`Error parsing JSON message:, ${error}`);
//         console.error("Error parsing JSON message:", error);
//         sendErrorResponse(ws, "Invalid JSON message");
//       }
//     }
//   });

//   ws.on("close", () => {
//     console.log("WebSocket client disconnected");
//     console.log("WebSocket client disconnected");
//   });
// };

// const processAndSendTranscription = async (
//   ws: WebSocket,
//   buffer: Buffer,
//   sampleRate: number,
//   channels: number
// ) => {
//   try {
//     console.log("Processing audio");
//     const transcription = await processAudioData(buffer, sampleRate, channels);
//     console.log("Sending transcription response");
//     sendTranscriptionResponse(ws, transcription);
//   } catch (error) {
//     console.error(`Error processing audio:, ${error}`);
//     console.error("Error processing audio:", error);
//     sendErrorResponse(ws, "Error processing audio");
//   }
// };

// const sendTranscriptionResponse = (
//   ws: WebSocket,
//   response: google.cloud.speech.v2.IRecognizeResponse
// ) => {
//   if (ws.readyState === WebSocket.OPEN) {
//     response.results?.forEach((result) => {
//       if (result.alternatives && result.alternatives[0]) {
//         const transcript = result.alternatives[0].transcript;
//         const message = {
//           type: "transcriber-response",
//           transcription: transcript,
//           channel: "customer",
//         };
//         ws.send(JSON.stringify(message));
//       }
//     });
//   }
// };

// const sendErrorResponse = (ws: WebSocket, errorMessage: string) => {
//   if (ws.readyState === WebSocket.OPEN) {
//     const message = {
//       type: "error",
//       error: errorMessage,
//     };
//     ws.send(JSON.stringify(message));
//     console.error(`Sent error response:, ${message}`);
//     console.error("Sent error response:", message);
//   }
// };


import WebSocket from "ws";
import { google } from "@google-cloud/speech/build/protos/protos";
import { StreamingRecognizer } from "./streamingRecognizer";
// import console from "../utils/logs";

interface StartMessage {
  type: "start";
  encoding: string;
  container: string;
  sampleRate: number;
  channels: number;
}

export const handleConnection = (ws: WebSocket) => {
  let recognizer: StreamingRecognizer | null = null;

  ws.on("message", async (message: WebSocket.Data, isBinary: boolean) => {
    if (isBinary) {
      if (!recognizer) {
        console.error("Received audio data before start message");
        sendErrorResponse(ws, "Start message not received");
        return;
      }

      try {
        recognizer.processAudioChunk(message as Buffer);
      } catch (error) {
        console.error(`Error processing audio chunk: ${error}`);
        sendErrorResponse(ws, "Error processing audio chunk");
      }
    } else {
      try {
        const jsonMessage = JSON.parse(message.toString()) as StartMessage;
        if (jsonMessage.type === "start") {
          console.log("Received start message, initializing streaming recognizer");
          recognizer = new StreamingRecognizer(
            jsonMessage.sampleRate,
            jsonMessage.channels,
            (transcription) => sendTranscriptionResponse(ws, transcription)
          );
          await recognizer.start();
        }
      } catch (error) {
        console.error(`Error parsing JSON message: ${error}`);
        sendErrorResponse(ws, "Invalid JSON message");
      }
    }
  });

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
    if (recognizer) {
      recognizer.stop();
      recognizer = null;
    }
  });

  ws.on("error", (error) => {
    console.error(`WebSocket error: ${error}`);
    if (recognizer) {
      recognizer.stop();
      recognizer = null;
    }
  });
};

const sendTranscriptionResponse = (
  ws: WebSocket,
  result: google.cloud.speech.v2.IStreamingRecognizeResponse
) => {
  if (ws.readyState === WebSocket.OPEN) {
    if (result.results && result.results[0]?.alternatives?.[0]) {
      const transcript = result.results[0].alternatives[0].transcript;
      const message = {
        type: "transcriber-response",
        transcription: transcript,
        channel: "customer",
      };
      ws.send(JSON.stringify(message));
    }
  }
};

const sendErrorResponse = (ws: WebSocket, errorMessage: string) => {
  if (ws.readyState === WebSocket.OPEN) {
    const message = {
      type: "error",
      error: errorMessage,
    };
    ws.send(JSON.stringify(message));
    console.error(`Sent error response: ${errorMessage}`);
  }
};
