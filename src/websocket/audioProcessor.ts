import { speechClient } from "../services/speechToText";
import { google } from "@google-cloud/speech/build/protos/protos";
import { config } from "../config";

export const processAudioData = async (
  audioBuffer: Buffer,
  sampleRate: number,
  channels: number
): Promise<google.cloud.speech.v2.IRecognizeResponse> => {
  try {
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

    const [response] = await speechClient.recognize(transcriptionRequest);

    if (!response.results || response.results.length === 0) {
      console.log("No transcription results returned");
    }

    return response;
  } catch (error: any) {
    console.error("Error processing audio:", error);
    if (error.response) {
      console.error(
        "Error response:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
    throw error;
  }
};
