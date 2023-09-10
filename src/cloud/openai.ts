import { Configuration, OpenAIApi } from "npm:openai";
import { load } from "https://deno.land/std@0.201.0/dotenv/mod.ts";

const keyEnvName = "OPENROUTER_API_KEY";
const env = await load({
  envPath: "./.env",
});

async function auth(): Promise<string | undefined> {
  if (Deno.env.has(keyEnvName)) return Deno.env.get(keyEnvName);
  if (env[keyEnvName]) return env[keyEnvName];

  const server = Deno.listen({ port: 18180 });
  const callback = encodeURIComponent("http://localhost:18180");
  console.log("Visit: https://openrouter.ai/auth?callback_url=" + callback);
  for await (const conn of server) {
    const httpConn = Deno.serveHttp(conn);
    for await (const requestEvent of httpConn) {
      const code = new URL(requestEvent.request.url).searchParams.get("code");

      const res = await fetch("https://openrouter.ai/api/v1/auth/keys", {
        method: "POST",
        body: JSON.stringify({
          code,
        }),
      }).then((res) => res.json());

      await requestEvent.respondWith(
        new Response("", {
          status: 200,
        }),
      );

      return res.key;
    }
  }
}

const key = await auth();

const configuration = new Configuration({
  apiKey: key,
  basePath: "https://openrouter.ai/api/v1",
  baseOptions: {
    headers: {
      "HTTP-Referer": "https://localhost:3000/",
      "X-Title": "Project Oracle",
    },
  },
});
export const openrouter = new OpenAIApi(configuration);

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
