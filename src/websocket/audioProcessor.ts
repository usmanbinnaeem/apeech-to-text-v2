import { speechClient } from "../services/speechToText";
import { google } from "@google-cloud/speech/build/protos/protos";
import { config } from "../config";
import logger from "../utils/logs";

export const processAudioData = async (
  audioBuffer: Buffer,
  sampleRate: number,
  channels: number
): Promise<google.cloud.speech.v2.IRecognizeResponse> => {
  try {
    logger.log("Processing audio data");

    // Convert the raw PCM data to base64
    const audioContent = audioBuffer.toString("base64");

    const transcriptionRequest = {
      recognizer: config.recognizerName,
      config: {
        explicitDecodingConfig: {
          encoding: "LINEAR16" as const,
          sampleRateHertz: sampleRate,
          audioChannelCount: channels,
        },
        languageCodes: ["is-IS"],
        model: "latest_long",
      },
      content: audioContent,
    };

    logger.log("Sending audio data to Google Speech-to-Text API");
    const [response] = await speechClient.recognize(transcriptionRequest);
    logger.log("Received transcription results");

    if (!response.results || response.results.length === 0) {
      logger.log("No transcription results returned");
    }

    return response;
  } catch (error: any) {
    logger.error(`Error processing audio: ${error}`);
    if (error.response) {
      logger.error(
        `Error response:
        ${error}`
      );
    }
    throw error;
  }
};
