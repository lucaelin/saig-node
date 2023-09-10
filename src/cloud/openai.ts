import { Configuration, OpenAIApi } from "npm:openai";
import { load } from "https://deno.land/std@0.201.0/dotenv/mod.ts";

const env = await load({
  envPath: "./.env",
});

if (!(Deno.env.has("OPENAI_API_KEY") || env["OPENAI_API_KEY"])) {
  throw new Error("Unable to find openai key");
}
export const openai = new OpenAIApi(
  new Configuration({
    apiKey: env["OPENAI_API_KEY"] || Deno.env.get("OPENAI_API_KEY"),
  }),
);

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
