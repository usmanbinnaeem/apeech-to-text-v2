import { speechClient } from "../services/speechToText";
import { google } from "@google-cloud/speech/build/protos/protos";
import { config } from "../config";
// import logger from "../utils/logs";

export const processAudioData = async (
  audioBuffer: Buffer,
  sampleRate: number,
  channels: number
): Promise<google.cloud.speech.v2.IRecognizeResponse> => {
  try {
    console.log("Processing audio data");
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

    console.log("Sending audio data to Google Speech-to-Text API");
    const [response] = await speechClient.recognize(transcriptionRequest);
    console.log("Received transcription results");
    if (!response.results || response.results.length === 0) {
      console.log("No transcription results returned");
      console.log("No transcription results returned");
    }

    return response;
  } catch (error: any) {
    console.error("Error processing audio:", error);
    console.error(`Error processing audio:, ${error}`);
    if (error.response) {
      console.error(
        "Error response:",
        JSON.stringify(error.response.data, null, 2)
      );
      console.error(`Error response:, ${JSON.stringify(error.response.data, null, 2)}`);
    }
    throw error;
  }
};
