import WebSocket from "ws";
import { speechClient } from "../services/speechToText";
import { config } from "../config";

export const handleMessage = async (
  ws: WebSocket,
  message: string,
  sessionId: string
) => {
  try {
    const msg = JSON.parse(message);

    if (msg.media && msg.media.payload) {
      try {
        const transcriptionRequest = {
          recognizer: config.recognizerName,
          config: {
            autoDecodingConfig: {},
            languageCodes: ["is-IS"],
            model: "latest_long",
          },
          content: msg.media.payload,
        };
        const [response] = await speechClient.recognize(transcriptionRequest);

        if (response.results && response.results.length > 0) {
          for (const result of response.results) {
            if (result.alternatives && result.alternatives[0]) {
              const transcript = result.alternatives[0].transcript;
              console.log(`Icelandic transcription: ${transcript}`);
              ws.send(
                JSON.stringify({
                  event: "transcription",
                  text: transcript,
                  isInterim: false,
                  sessionId: sessionId,
                })
              );
            }
          }
        } else {
          ws.send(
            JSON.stringify({
              event: "transcription",
              text: "No transcription available",
              isInterim: false,
              sessionId: sessionId,
            })
          );
        }
      } catch (audioError) {
        ws.send(
          JSON.stringify({
            event: "error",
            message: "Error processing audio data",
            details:
              audioError instanceof Error
                ? audioError.message
                : "Unknown error",
            sessionId: sessionId,
          })
        );
      }
    } else {
      console.error("Invalid media event structure");
      ws.send(
        JSON.stringify({
          event: "error",
          message: "Invalid media event structure",
          sessionId: sessionId,
        })
      );
    }
  } catch (error) {
    ws.send(
      JSON.stringify({
        event: "error",
        message: "Error processing message",
        details: error instanceof Error ? error.message : "Unknown error",
        sessionId: sessionId,
      })
    );
  }
};
