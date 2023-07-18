import { generateAudio } from "./audio.ts";
import openai from "./cloud/openai.ts";
import { GameEvent, gameEvents } from "./events.ts";

const createLogEntry = (event: GameEvent) => {
  if (["chat", "inputtext"].includes(event.kind) && event.chat) {
    return `${event.chat.name}${
      event.chat.background ? " (in the Background)" : ""
    }: ${event.chat.message}`.trim();
  }
  if (["book"].includes(event.kind)) {
    return `Storyteller: Player is reading the book ${event.message}.`;
  }
  if (["goodnight"].includes(event.kind)) {
    return `Storyteller: Player goes to sleep.`;
  }
  if (["goodmorning"].includes(event.kind)) {
    return `Storyteller: Player wakes up again.`;
  }

  return ``;
};

const generatePrompt = (events: GameEvent[]) =>
  `
You roleplay as Herika, a mage in Skyrim! 
Current Location: ${
    events.reduce((p, c) => c?.context?.location ?? p, "Unknown")
  }
POIs nearby: ${
    events.reduce((p, c) => c?.context?.pois?.join(", ") ?? p, "None")
  }
NPCs nearby: ${
    events.reduce((p, c) => c?.context?.npcs?.join(", ") ?? p, "None")
  }
Here is what happend last:
${
    events
      .filter((e) => ["chat", "inputtext", "Herika", "book"].includes(e.kind))
      .slice(-10)
      .map(createLogEntry)
      .filter((x) => x)
      .join("\n")
  }
Herika (You) says:
`.trim();

async function submitPrompt(prompt: string): Promise<string> {
  // DO openai stuff
  console.log("running openai prompt\n", prompt);
  const result = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 100,
    stop: ["\n"],
  });
  return result.data.choices[0].message!.content!;
}

gameEvents.addEventListener("inputtext", async (_e) => {
  const prompt = await generatePrompt(gameEvents.getEventLog());
  const responseText = await submitPrompt(prompt);
  const responseAudio = await generateAudio(responseText);

  gameEvents.publishAction({
    actor: "Herika",
    action: "AASPGQuestDialogue2Topic1B1Topic",
    input: responseText,
    audio: responseAudio,
  });
});

gameEvents.addEventListener("book", async (_e) => {
  const prompt = await generatePrompt(gameEvents.getEventLog());
  const responseText = await submitPrompt(prompt);

  for (const line of responseText.split("\n").filter((l) => l)) {
    const responseAudio = await generateAudio(line);
    gameEvents.publishAction({
      actor: "Herika",
      action: "AASPGQuestDialogue2Topic1B1Topic",
      input: line,
      audio: responseAudio,
    });
  }
});
