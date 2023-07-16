import config from "../config.ts";
import { Configuration, OpenAIApi } from "npm:openai";

const configuration = new Configuration({
  apiKey: config.openai_key,
});
export const openai = new OpenAIApi(configuration);
export default openai;

export interface TranscriptionVerboseJson {
  text: string;
  duration: number;
  language: string | "english";
  segments: {
    avg_logprob: number;
    compression_ratio: number;
    end: number;
    id: number;
    no_speech_prob: number;
    seek: number;
    start: number;
    temperature: number;
    text: string;
    tokens: number[];
    transient: false;
  }[];
  task: string | "transcribe";
}
