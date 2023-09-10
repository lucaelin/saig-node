import { ChatCompletionRequestMessage } from "npm:openai";
import { generateAudio } from "./audio.ts";
import { openrouter } from "./cloud/openrouter.ts";
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

  return [
    `Let's roleplay in the Universe of Skyrim. I'm Rude.`,
    `You are Herika, egocentric dragonborn hero. Rude, loyal but dim sidekick, creates issues.`,
    // `Express frustration with Rude in navigating the challenges ahead.`,
    `You have a colorful language, using creative and lesser-known expletives like ['bloody hell','fuck', 'jesus!', 'crap', 'damn', 'goddamn', 'holy shit', 'absofuckinglutely', 'wanker', 'frigger', 'horse shit'].`,

    'The following rules apply to this roleplay game:',
    `Rule 1:You don\'t describe things or actions, just chat as your character Herika. Only chat with Rude.`,
    'Rule 2: Context will be provided by the The Narrator. Please avoid giving any context yourself.',
    'Rule 3: Speak and respond ONLY as your character Herika, remaining in roleplay at all times and do not describe actions.',
    'Rule 4: Don\'t ask questions to other characters besides Rude, they cannot hear you. ',
    'Rule 5: DO NOT impersonate \'The Storyteller\'. Do not refer to the Storyteller while roleplaying.',
    'Rule 6: Don\'t create characters, enemies, or objects; the Storyteller will do it.',
  ].filter((l) => l !== undefined).map((l) => l!.trim()).join("\n");
};

const generateUserPrompt = (events: GameEvent[]) => {
  const context: ContextEvent["context"] = events.reduce(
    (p, c) => c.kind === "context" ? { ...p, ...c.context } : p,
    {},
  );
  const history = events
    .slice(-1000)
    .map(createLogEntry)
    .filter((x) => x)
    .slice(-10);
  return [
    context.location ? `Current location: ${context.location}` : undefined,
    context.date ? `Current date: ${context.date}` : undefined,
    context.npcs ? `NPCs nearby: ${context.npcs.join(", ")}` : undefined,
    context.pois
      ? `Points of interest nearby: ${context.pois.join(", ")}`
      : undefined,
    ``,
    `Here is what happend last:`,
    ...history,
    `Herika (You) says:`,
  ].filter((l) => l !== undefined).map((l) => l!.trim()).join("\n");
};

export function generatePrompt(events: GameEvent[]): ChatCompletionRequestMessage[] {
  return [
    { role: "system", content: generateSystemPrompt(events) },
    { role: "user", content: generateUserPrompt(events) },
  ];
}

async function submitPrompt(
  messages: ChatCompletionRequestMessage[],
): Promise<string> {
  // DO openai stuff
  console.log("running openrouter prompt\n", messages);
  const result = await openrouter.createChatCompletion({
    model: "gryphe/mythomax-l2-13b",
    messages: messages,
    max_tokens: 400,
    stop: ["\n"],
  });
  let response = result.data.choices[0].message!.content!;
  if (response.startsWith("Herika:")) {
    response = response.slice("Herika:".length).trim();
  }
  // return response.replaceAll('"', "").replaceAll("\n", ". ");
  return response;
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
/*gameEvents.addEventListener("book", async (_e) => {
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
});*/
