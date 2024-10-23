// import { speechClient } from "../services/speechToText";
// import { google } from "@google-cloud/speech/build/protos/protos";
// import { config } from "../config";
// import console from "../utils/logs";

// export class StreamingRecognizer {
//   private stream: any;
//   private isStreaming: boolean = false;

//   constructor(
//     private sampleRate: number,
//     private channels: number,
//     private onTranscription: (response: google.cloud.speech.v2.IStreamingRecognizeResponse) => void
//   ) {}

//   async start() {
//     try {
//       const request = {
//         recognizer: config.recognizerName,
//         streamingConfig: {
//           config: {
//             explicitDecodingConfig: {
//               encoding: "LINEAR16" as const,
//               sampleRateHertz: this.sampleRate,
//               audioChannelCount: this.channels,
//             },
//             languageCodes: ["is-IS"],
//             model: "latest_long",
//           },
//         },
//       };

//       this.stream = speechClient.streamingRecognize();
//       this.isStreaming = true;

//       this.stream.on("error", (error: Error) => {
//         console.error(`Streaming recognition error: ${error}`);
//         this.stop();
//       });

//       this.stream.on("data", (response: google.cloud.speech.v2.IStreamingRecognizeResponse) => {
//         if (response.results && response.results.length > 0) {
//           this.onTranscription(response);
//         }
//       });

//       // Send streaming config
//       this.stream.write(request);
//       console.log("Streaming recognizer started");
//     } catch (error) {
//       console.error(`Error starting streaming recognizer: ${error}`);
//       throw error;
//     }
//   }

//   processAudioChunk(chunk: Buffer) {
//     if (!this.isStreaming || !this.stream) {
//       throw new Error("Streaming recognizer not initialized");
//     }

//     try {
//       const request = {
//         audio: {
//           content: chunk.toString("base64"),
//         },
//       };
//       this.stream.write(request);
//     } catch (error) {
//       console.error(`Error processing audio chunk: ${error}`);
//       throw error;
//     }
//   }

//   stop() {
//     if (this.isStreaming && this.stream) {
//       this.stream.end();
//       this.isStreaming = false;
//       console.log("Streaming recognizer stopped");
//     }
//   }
// }

// src/websocket/streamingRecognizer.ts
// import { speechClient } from "../services/speechToText";
// import { google } from "@google-cloud/speech/build/protos/protos";
// import { config } from "../config";
// // import console from "../utils/logs";

// export class StreamingRecognizer {
//   private stream: any;
//   private isStreaming: boolean = false;
//   private bytesPerSample: number = 2; // 16-bit = 2 bytes per sample
//   private expectedChunkSize: number;

//   constructor(
//     private sampleRate: number,
//     private channels: number,
//     private onTranscription: (response: google.cloud.speech.v2.IStreamingRecognizeResponse) => void
//   ) {
//     // Calculate expected chunk size (bytes per sample * channels)
//     this.expectedChunkSize = this.bytesPerSample * this.channels;
//   }

//   async start() {
//     try {
//       const request = {
//         recognizer: config.recognizerName,
//         streamingConfig: {
//           config: {
//             explicitDecodingConfig: {
//               encoding: "LINEAR16" as const,  // This specifies 16-bit PCM
//               sampleRateHertz: this.sampleRate,
//               audioChannelCount: this.channels,
//             },
//             languageCodes: ["is-IS"],
//             model: "latest_long",
//           },
//         },
//       };

//       this.stream = speechClient.streamingRecognize();
//       this.isStreaming = true;

//       this.stream.on("error", (error: Error) => {
//         console.error(`Streaming recognition error: ${error}`);
//         this.stop();
//       });

//       this.stream.on("data", (response: google.cloud.speech.v2.IStreamingRecognizeResponse) => {
//         if (response.results && response.results.length > 0) {
//           this.onTranscription(response);
//         }
//       });

//       this.stream.write(request);
//       console.log("Streaming recognizer started");
//     } catch (error) {
//       console.error(`Error starting streaming recognizer: ${error}`);
//       throw error;
//     }
//   }

//   processAudioChunk(chunk: Buffer) {
//     if (!this.isStreaming || !this.stream) {
//         // console.log(chunk);
//       throw new Error("Streaming recognizer not initialized");
//     }

//     try {
//       // Validate chunk size
//       if (chunk.length % this.expectedChunkSize !== 0) {
//         console.warn(`Received chunk size ${chunk.length} is not a multiple of ${this.expectedChunkSize} bytes`);
//       }

//       // Ensure the audio data is in the correct format (16-bit PCM)
//       const validatedChunk = this.validateAndNormalizeChunk(chunk);
      
//       const request = {
//         audio: {
//           content: validatedChunk.toString("base64"),
//         },
//       };
//       this.stream.write(request);
//     } catch (error) {
//       console.error(`Error processing audio chunk: ${error}`);
//       throw error;
//     }
//   }

//   private validateAndNormalizeChunk(chunk: Buffer): Buffer {
//     // Check if we need to convert endianness
//     // PCM16 should be little-endian for Google Speech-to-Text
//     if (!this.isLittleEndian(chunk)) {
//       chunk = this.convertEndianness(chunk);
//     }
    
//     return chunk;
//   }

//   private isLittleEndian(chunk: Buffer): boolean {
//     // Implementation detail: Most systems are little-endian
//     // This is a simplified check that could be enhanced based on your needs
//     return true;
//   }

//   private convertEndianness(chunk: Buffer): Buffer {
//     const converted = Buffer.alloc(chunk.length);
//     for (let i = 0; i < chunk.length; i += 2) {
//       converted[i] = chunk[i + 1];
//       converted[i + 1] = chunk[i];
//     }
//     return converted;
//   }

//   stop() {
//     if (this.isStreaming && this.stream) {
//       this.stream.end();
//       this.isStreaming = false;
//       console.log("Streaming recognizer stopped");
//     }
//   }
// }



// src/websocket/streamingRecognizer.ts
import { speechClient } from "../services/speechToText";
import { google } from "@google-cloud/speech/build/protos/protos";
import { config } from "../config";
import logger from "../utils/logs";

export class StreamingRecognizer {
  private stream: any;
  private isStreaming: boolean = false;
  private bytesPerSample: number = 2;
  private expectedChunkSize: number;

  constructor(
    private sampleRate: number,
    private channels: number,
    private onTranscription: (response: google.cloud.speech.v2.IStreamingRecognizeResponse) => void
  ) {
    this.expectedChunkSize = this.bytesPerSample * this.channels;
  }

  async start() {
    try {
      // First, verify the recognizer exists
      if (!config.recognizerName) {
        throw new Error("Recognizer name is not configured");
      }

      // Create streaming recognize stream
      this.stream = speechClient.streamingRecognize();
      this.isStreaming = true;

      // Set up error handler
      this.stream.on("error", (error: Error) => {
        logger.error(`Streaming recognition error: ${error}`);
        this.stop();
      });

      // Set up data handler
      this.stream.on("data", (response: google.cloud.speech.v2.IStreamingRecognizeResponse) => {
        if (response.results && response.results.length > 0) {
          this.onTranscription(response);
        }
      });

      // Send the configuration request
      const configRequest = {
        streaming_config: {
          config: {
            name: config.recognizerName,
            features: {
              enable_automatic_punctuation: true
            },
            language_codes: ["is-IS"],
            model: "latest_long",
            decoder_config: {
              audio_encoding: "LINEAR16" as const,
              sample_rate_hertz: this.sampleRate,
              audio_channel_count: this.channels
            }
          }
        }
      };

      this.stream.write(configRequest);
      logger.log("Streaming recognizer started");
    } catch (error) {
      logger.error(`Error starting streaming recognizer: ${error}`);
      throw error;
    }
  }

  processAudioChunk(chunk: Buffer) {
    if (!this.isStreaming || !this.stream) {
      throw new Error("Streaming recognizer not initialized");
    }

    try {
      // Validate chunk size
      if (chunk.length % this.expectedChunkSize !== 0) {
        logger.warn(`Received chunk size ${chunk.length} is not a multiple of ${this.expectedChunkSize} bytes`);
      }

      // Send the audio content
      const request = {
        streaming_request: {
          audio: chunk.toString("base64")
        }
      };

      this.stream.write(request);
    } catch (error) {
      logger.error(`Error processing audio chunk: ${error}`);
      throw error;
    }
  }

  stop() {
    if (this.isStreaming && this.stream) {
      this.stream.end();
      this.isStreaming = false;
      logger.log("Streaming recognizer stopped");
    }
  }
}

// Example config.ts structure:
/*
export const config = {
  recognizerName: "projects/YOUR_PROJECT_ID/locations/YOUR_LOCATION/recognizers/YOUR_RECOGNIZER_ID",
  port: 3001,
  // ... other config
};
*/