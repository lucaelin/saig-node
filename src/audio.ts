import { Buffer } from "node:buffer";
import { Readable } from "node:stream";
import { tts } from "./cloud/gcp.ts";
import { openai, TranscriptionVerboseJson } from "./cloud/openai.ts";

export async function generateAudio(text: string): Promise<Uint8Array> {
  console.log("generating audio for", text);

  const audioResponse = await tts.textSynthesize({
    input: { ssml: `<speak>${text}<break time="500ms"/></speak>` },
    voice: {
      ssmlGender: "FEMALE",
      name: "en-GB-Neural2-C",
      languageCode: "en-GB",
    },
    audioConfig: { audioEncoding: "LINEAR16", speakingRate: 1.1 },
  });

  return audioResponse.audioContent as Uint8Array;
}

export async function transcribeAudio(audio: Uint8Array): Promise<string> {
  console.log("transcribing audio length", audio.byteLength);
  const prompt = undefined;
  const responseFormat = "verbose_json";
  const temperature = 0.1;
  const language = undefined;

  const file = Readable.from(Buffer.from(audio));
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
