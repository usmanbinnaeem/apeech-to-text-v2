// const WebSocket = require("ws");
// const fs = require("fs");
// //wss://speech-to-text.uksouth.cloudapp.azure.com/transcribe
// //ws://localhost:3001/transcribe
// const SERVER_URL = "wss://speech-to-text.uksouth.cloudapp.azure.com/transcribe";
// const VAPI_SECRET = "speech-to-text-secret";
// const AUDIO_FILE_PATH = "./output.raw";

// // const ws = new WebSocket(SERVER_URL, {
// //   headers: {
// //     "x-vapi-secret": VAPI_SECRET,
// //   },
// // });

// const ws = new WebSocket(SERVER_URL);

// ws.on("open", function open() {
//   console.log("Connected to the server");

//   // Send start message
//   const startMessage = {
//     type: "start",
//     encoding: "linear16",
//     container: "raw",
//     sampleRate: 16000,
//     channels: 1,
//   };
//   ws.send(JSON.stringify(startMessage));
//   console.log("Sent start message:", startMessage);

//   // Read and send audio file
//   const audioFile = fs.readFileSync(AUDIO_FILE_PATH);
//   console.log(`Sending audio file of size: ${audioFile.length} bytes`);

//     ws.send(audioFile);
// });

// ws.on("message", function incoming(data) {
//   const message = JSON.parse(data);
//   if (message.type === "transcriber-response") {
//     console.log("Received transcription:", message);
//   } else if (message.type === "error") {
//     console.error("Received error:", message);
//   } else {
//     console.log("Received unknown message type:", message);
//   }
// });

// ws.on("close", function close() {
//   console.log("Disconnected from the server");
// });

// ws.on("error", function error(err) {
//   console.error("WebSocket error:", err);
// });

// const WebSocket = require("ws");
// const fs = require("fs");

// const SERVER_URL = "ws://localhost:3001/transcribe";
// const VAPI_SECRET = "speech-to-text-secret";
// const AUDIO_FILE_PATH = "./output.raw";
// const CHUNK_SIZE = 8192; // 8KB chunks
// const CHUNK_INTERVAL = 100; // Send chunk every 100ms to simulate real-time

// class AudioStreamer {
//   constructor(serverUrl, audioFilePath) {
//     this.ws = new WebSocket(serverUrl);
//     this.audioFilePath = audioFilePath;
//     this.setupWebSocket();
//   }

//   setupWebSocket() {
//     this.ws.on("open", () => this.handleOpen());
//     this.ws.on("message", (data) => this.handleMessage(data));
//     this.ws.on("close", () => this.handleClose());
//     this.ws.on("error", (err) => this.handleError(err));
//   }

//   handleOpen() {
//     console.log("Connected to the server");

//     // Send start message
//     const startMessage = {
//       type: "start",
//       encoding: "linear16",
//       container: "raw",
//       sampleRate: 16000,
//       channels: 1,
//     };
//     this.ws.send(JSON.stringify(startMessage));
//     console.log("Sent start message:", startMessage);
//     this.streamAudio()
//     // Start streaming audio after a short delay
//     // setTimeout(() => this.streamAudio(), 1000);
//   }

//   async streamAudio() {
//     try {
//       const audioFile = fs.readFileSync(this.audioFilePath);
//       console.log(`Starting to stream audio file of size: ${audioFile.length} bytes`);

//       let offset = 0;
//       const sendNextChunk = () => {
//         if (offset >= audioFile.length) {
//           console.log("Finished streaming audio file");
//           return;
//         }

//         const chunk = audioFile.slice(offset, offset + CHUNK_SIZE);
//         if (this.ws.readyState === WebSocket.OPEN) {
//           this.ws.send(chunk);
//           console.log(`Sent chunk of size: ${chunk.length} bytes (offset: ${offset})`);
//           offset += chunk.length;
          
//           // Schedule next chunk
//           setTimeout(sendNextChunk, CHUNK_INTERVAL);
//         }
//       };

//       // Start sending chunks
//       sendNextChunk();
//     } catch (error) {
//       console.error("Error streaming audio:", error);
//       this.ws.close();
//     }
//   }

//   handleMessage(data) {
//     try {
//       const message = JSON.parse(data);
//       if (message.type === "transcriber-response") {
//         console.log("Received transcription:", {
//           text: message.transcription,
//           isFinal: message.isFinal,
//           channel: message.channel
//         });
//       } else if (message.type === "error") {
//         console.error("Received error:", message);
//       } else {
//         console.log("Received unknown message type:", message);
//       }
//     } catch (error) {
//       console.error("Error parsing message:", error);
//     }
//   }

//   handleClose() {
//     console.log("Disconnected from the server");
//   }

//   handleError(err) {
//     console.error("WebSocket error:", err);
//   }
// }

// // Command line arguments support
// const args = process.argv.slice(2);
// const serverUrl = args[0] || SERVER_URL;
// const audioFilePath = args[1] || AUDIO_FILE_PATH;

// console.log(`Starting test with:
// Server URL: ${serverUrl}
// Audio file: ${audioFilePath}
// Chunk size: ${CHUNK_SIZE} bytes
// Chunk interval: ${CHUNK_INTERVAL}ms
// `);

// // Create and start the audio streamer
// const streamer = new AudioStreamer(serverUrl, audioFilePath);


const WebSocket = require("ws");
const fs = require("fs");

class PCMAudioStreamer {
  constructor(serverUrl, audioFilePath) {
    this.ws = new WebSocket(serverUrl);
    this.audioFilePath = audioFilePath;
    this.sampleRate = 16000;
    this.channels = 1;
    this.bytesPerSample = 2; // 16-bit = 2 bytes
    this.setupWebSocket();
  }

  setupWebSocket() {
    this.ws.on("open", () => this.handleOpen());
    this.ws.on("message", (data) => this.handleMessage(data));
    this.ws.on("close", () => this.handleClose());
    this.ws.on("error", (err) => this.handleError(err));
  }

  handleOpen() {
    console.log("Connected to the server");

    const startMessage = {
      type: "start",
      encoding: "linear16", // Specifying 16-bit PCM
      container: "raw",
      sampleRate: this.sampleRate,
      channels: this.channels,
    };
    this.ws.send(JSON.stringify(startMessage));
    console.log("Sent start message:", startMessage);

    setTimeout(() => this.streamAudio(), 1000);
  }

  async streamAudio() {
    try {
      const audioFile = fs.readFileSync(this.audioFilePath);
      console.log(`Starting to stream audio file of size: ${audioFile.length} bytes`);

      // Calculate chunk size to represent 100ms of audio
      const samplesPerChunk = this.sampleRate * 0.1; // 0.1 seconds
      const bytesPerChunk = samplesPerChunk * this.channels * this.bytesPerSample;
      const chunkSize = Math.floor(bytesPerChunk);

      let offset = 0;
      const sendNextChunk = () => {
        if (offset >= audioFile.length) {
          console.log("Finished streaming audio file");
          return;
        }

        const chunk = audioFile.slice(offset, offset + chunkSize);
        
        // Validate chunk size is multiple of frame size
        const frameSize = this.channels * this.bytesPerSample;
        const validLength = Math.floor(chunk.length / frameSize) * frameSize;
        const validChunk = chunk.slice(0, validLength);

        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(validChunk);
          console.log(`Sent chunk of size: ${validChunk.length} bytes (offset: ${offset})`);
          offset += validChunk.length;
          
          // Schedule next chunk (simulate real-time)
          setTimeout(sendNextChunk, 1000); // 100ms intervals
        }
      };

      sendNextChunk();
    } catch (error) {
      console.error("Error streaming audio:", error);
      this.ws.close();
    }
  }

  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      if (message.type === "transcriber-response") {
        console.log("Received transcription:", {
          text: message.transcription,
          isFinal: message.isFinal,
          channel: message.channel
        });
      } else if (message.type === "error") {
        console.error("Received error:", message);
      } else {
        console.log("Received unknown message type:", message);
      }
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  }

  handleClose() {
    console.log("Disconnected from the server");
  }

  handleError(err) {
    console.error("WebSocket error:", err);
  }
}

// Usage
const SERVER_URL = "ws://localhost:3001/transcribe";
const AUDIO_FILE_PATH = "./output.raw";

console.log(`Starting PCM audio test with:
Server URL: ${SERVER_URL}
Audio file: ${AUDIO_FILE_PATH}
Sample rate: 16000 Hz
Channels: 1
Bit depth: 16-bit
`);

const streamer = new PCMAudioStreamer(SERVER_URL, AUDIO_FILE_PATH);