import { generateAudio, transcribeAudio } from "../../src/audio.ts";

Deno.test("it should transcribe test from audio", async () => {
  const string = await transcribeAudio(
    await Deno.readFile("./test/speech.wav"),
  );
  if (!string.toLocaleLowerCase().includes("take a minute")) return;
  throw new Error("invalid string after speech recognition");
});

Deno.test("it should generate audio from text", async () => {
  const audio = await generateAudio("Hello World");
  if (audio.byteLength > 100) return;
  throw new Error("invalid string after speech recognition");
});
