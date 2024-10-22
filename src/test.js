const WebSocket = require("ws");
const fs = require("fs");
//wss://speech-to-text.uksouth.cloudapp.azure.com/transcribe
//ws://localhost:3001/transcribe
const SERVER_URL = "wss://speech-to-text.uksouth.cloudapp.azure.com/transcribe";
const VAPI_SECRET = "speech-to-text-secret";
const AUDIO_FILE_PATH = "./output.raw";

// const ws = new WebSocket(SERVER_URL, {
//   headers: {
//     "x-vapi-secret": VAPI_SECRET,
//   },
// });

const ws = new WebSocket(SERVER_URL);

ws.on("open", function open() {
  console.log("Connected to the server");

  // Send start message
  const startMessage = {
    type: "start",
    encoding: "linear16",
    container: "raw",
    sampleRate: 16000,
    channels: 1,
  };
  ws.send(JSON.stringify(startMessage));
  console.log("Sent start message:", startMessage);

  // Read and send audio file
  const audioFile = fs.readFileSync(AUDIO_FILE_PATH);
  console.log(`Sending audio file of size: ${audioFile.length} bytes`);

  // send data in multiple chunks
  const chunkSize = 3200;
  for (let i = 0; i < audioFile.length; i += chunkSize) {
    ws.send(audioFile.slice(i, i + chunkSize));
  }
});

ws.on("message", function incoming(data) {
  const message = JSON.parse(data);
  if (message.type === "transcriber-response") {
    console.log("Received transcription:", message);
  } else if (message.type === "error") {
    console.error("Received error:", message);
  } else {
    console.log("Received unknown message type:", message);
  }
});

ws.on("close", function close() {
  console.log("Disconnected from the server");
});

ws.on("error", function error(err) {
  console.error("WebSocket error:", err);
});
