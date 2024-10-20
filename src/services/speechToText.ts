import { v2 as speechV2 } from "@google-cloud/speech";
import { credentials } from '../config/index';
export const speechClient = new speechV2.SpeechClient({ credentials });
