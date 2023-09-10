import { ChatCompletionRequestMessage } from "npm:openai";
import { generateAudio } from "./audio.ts";
import { openrouter } from "./cloud/openai.ts";
import { ContextEvent, GameEvent, gameEvents } from "./events.ts";

const createLogEntry = (event: GameEvent) => {
  if (event.kind === "chat") {
    return `${event.chat.name}${
      event.chat.background ? " (in the Background)" : ""
    }: ${event.chat.message}`.trim();
  }
  if (event.kind === "book") {
    return `Storyteller: Player is reading the book "${event.title}".`;
  }
  if (event.kind === "sleep") {
    if (event.asleep) {
      return `Storyteller: Player falls asleep.`;
    } else {
      return `Storyteller: Player wakes up again.`;
    }
  }

  return ``;
};

const generateSystemPrompt = (events: GameEvent[]) => {
  const context: ContextEvent["context"] = events.reduce(
    (p, c) => c.kind === "context" ? { ...p, ...c.context } : p,
    {},
  );
  return [
    `Let's roleplay in the Universe of Skyrim. I'm Rude.`,
    `You are Herika, egocentric dragonborn hero. Rude, loyal but dim sidekick, creates issues.`,
    `Express frustration with Rude in navigating the challenges ahead.`,
    `You have a colorful language, using creative and lesser-known expletives like ['bloody hell','fuck', 'jesus!', 'crap', 'damn', 'goddamn', 'holy shit', 'absofuckinglutely', 'wanker', 'frigger', 'horse shit'].`,
    context.location ? `Current location: ${context.location}` : undefined,
    context.date ? `Current date: ${context.date}` : undefined,
    context.npcs ? `NPCs nearby: ${context.npcs.join(", ")}` : undefined,
    context.pois
      ? `Points of interest nearby: ${context.pois.join(", ")}`
      : undefined,
    `You dont describe things or actions, just chat as your character. Only chat with Rude.`,
  ].filter((l) => l !== undefined).map((l) => l!.trim()).join("\n");
};

const generateUserPrompt = (events: GameEvent[]) => {
  const history = events
    .slice(-100)
    .map(createLogEntry)
    .filter((x) => x);
  return [
    `Here is what happend last:`,
    ...history,
    `Herika (You) says:`,
  ].filter((l) => l !== undefined).map((l) => l!.trim()).join("\n");
};

function generatePrompt(events: GameEvent[]): ChatCompletionRequestMessage[] {
  return [
    { role: "system", content: generateSystemPrompt(events) },
    { role: "user", content: generateUserPrompt(events) },
  ];
}

async function submitPrompt(
  messages: ChatCompletionRequestMessage[],
): Promise<string> {
  // DO openai stuff
  // console.log("running openai prompt\n", prompt);
  const result = await openrouter.createChatCompletion({
    model: "pygmalionai/mythalion-13b",
    messages: messages,
    max_tokens: 1000,
    //stop: ["\n"],
  });
  let response = result.data.choices[0].message!.content!;
  if (response.startsWith("Herika:")) {
    response = response.slice("Herika:".length).trim();
  }
  return response.replaceAll('"', "").replaceAll("\n", ". ");
}

gameEvents.addEventListener("chat", async (e) => {
  if ((e as any).detail.chat.name === "Herika") return;
  const prompt = generatePrompt(gameEvents.getEventLog());
  const responseText = await submitPrompt(prompt);
  const responseAudio = await generateAudio(responseText);

  gameEvents.publishAction({
    kind: "chat",
    chat: {
      name: "Herika",
      message: responseText,
      audio: responseAudio,
    },
  });
});
gameEvents.addEventListener("book", async (_e) => {
  const prompt = generatePrompt(gameEvents.getEventLog());
  const responseText = await submitPrompt(prompt);
  const responseAudio = await generateAudio(responseText);

  gameEvents.publishAction({
    kind: "chat",
    chat: {
      name: "Herika",
      message: responseText,
      audio: responseAudio,
    },
  });
});
