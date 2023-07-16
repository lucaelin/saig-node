import { Buffer } from "node:buffer";
import { Readable } from "node:stream";
// @deno-types="npm:@types/express@4.17.15"
import express, { Router } from "npm:express";
import { Md5 } from "https://deno.land/std@0.95.0/hash/md5.ts";
import _config from "./config.ts";
import openai, { TranscriptionVerboseJson } from "./cloud/openai.ts";
import { tts } from "./cloud/gcp.ts";

import multipart from "npm:connect-multiparty";
const multipartMiddleware = multipart();

const app = express();
const gw = Router();

function parseEvent(eventString: string) {
  const [kind, ts, gameTs, message] = eventString.split("|");
  const context = (message.trim().match(/\(([^)]|\)\()*\)/) ?? []).at(0);
  const messageClean = message.trim().slice((context ?? "").length).trim();
  return {
    kind,
    timestamp: parseFloat(ts) / 1000000000,
    gameTimestamp: parseFloat(gameTs),
    context: context ? context : undefined,
    message: messageClean ? messageClean : undefined,
  };
}

async function generatePrompt(
  events: ReturnType<typeof parseEvent>[],
): Promise<string> {
  await Promise.resolve();
  return `
You are Herika, a mage in Skyrim!
Here is what happend last:
${
    events.slice(-10).map((event) =>
      `
${event.context}
${event.message}
`.trim()
    ).join("\n")
  }
Herika:
`;
}

async function submitPrompt(prompt: string): Promise<string> {
  // DO openai stuff
  console.log("running openai prompt\n", prompt);
  const result = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
  });

  return result.data.choices[0].message!.content!;
}

const events: ReturnType<typeof parseEvent>[] = [];
async function logEvent(event: ReturnType<typeof parseEvent>): Promise<void> {
  events.push(event);
  await Promise.resolve();
}
async function generateResponse() {
  const prompt = await generatePrompt(events);
  const response = await submitPrompt(prompt);
  return response;
}
async function generateAudio(text: string): Promise<Uint8Array> {
  console.log("generating audio for", text);

  const audioResponse = await tts.textSynthesize({
    input: { text },
    voice: {
      ssmlGender: "FEMALE",
      name: "en-GB-Neural2-C",
      languageCode: "en-GB",
    },
    audioConfig: { audioEncoding: "LINEAR16", speakingRate: 1.1 },
  });

  return audioResponse.audioContent as Uint8Array;
}

async function transcribeAudio(audio: Uint8Array): Promise<string> {
  console.log("transcribing audio", audio);
  const prompt = undefined;
  const responseFormat = "verbose_json";
  const temperature = 0.1;
  const language = undefined;

  const file = Readable.from(audio);
  (file as unknown as { path: string }).path = "audio.wav";

  const result = await openai.createTranscription(
    file as unknown as File,
    "whisper-1",
    prompt,
    responseFormat,
    temperature,
    language,
  );
  const transcription = result.data as TranscriptionVerboseJson;

  return transcription.segments.every((s) => s.no_speech_prob > 0.5)
    ? ""
    : transcription.text;
}

gw.get("/comm.php", async (req, res) => {
  const data = atob(req.query.DATA as string);
  const event = parseEvent(data);
  console.log(event);
  if (event.kind !== "request") {
    await logEvent(event);
  }
  res.send(200);
  // may also send
  // Player|Simchat|Twitch Chat User randomName23 said "i need you to ask me two quesitons in succession, simply respond!"
});

gw.post("/stt.php", multipartMiddleware, async (req, res) => {
  const upload =
    (req as unknown as { files: Record<string, { path: string }> }).files.file;
  const audio = await Deno.readFile(upload.path);
  const text = await transcribeAudio(audio);
  res.send(text);
});

let globalNextAudioResponse: Record<string, Uint8Array>;

gw.get("/stream.php", async (req, res) => {
  const data = atob(req.query.DATA as string);
  // inputtext|366531088273800|636306688|(Context location: )Rude:Tommyjog

  const event = parseEvent(data);
  console.log(event);
  await logEvent(event);
  const responseText = await generateResponse();
  const responseAudio = await generateAudio(responseText); // async
  const responseAudioFileName = new Md5().update(responseText).toString() +
    ".wav";
  globalNextAudioResponse[responseAudioFileName] = responseAudio;

  const responseEvent =
    `Herika|AASPGQuestDialogue2Topic1B1Topic|${responseText}`;
  res.send(responseEvent + `\r\nX-CUSTOM-CLOSE`);
});

gw.get("/soundcache/:hash", (req, res) => {
  const file = globalNextAudioResponse[req.params.hash];
  if (!file) return res.sendStatus(404);
  res.contentType("audio/x-wav");
  res.send(Buffer.from(file));
});

app.use("/saig-gwserver", gw);
app.use("//saig-gwserver", gw);
app.all("*", (req, res) => {
  console.log("UNEXPECTED REQUEST:", req.method, req.url, req.baseUrl);
  res.sendStatus(404);
});
app.listen(8080, "127.0.0.1", () => {
  console.log("server started");
});
