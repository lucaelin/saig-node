// @deno-types="npm:@types/express@4.17.15"
import {Router} from "npm:express";
import nodeFs from "node:fs";
import nodePath from "node:path";
import {gameEvents} from "./events.ts";
import {generatePrompt} from "./ai.ts";
import {generateAudio} from "./audio.ts";

export const ui = Router();

ui.get("/api/history", (req, res) => {
  res.send(gameEvents.getEventLog());
});
ui.get("/api/prompt", (req, res) => {
  const events = gameEvents.getEventLog();
  res.send(generatePrompt(events));
});

ui.get("/api/sayAsAi", async (req, res) => {
  const line = req.query["text"]?.toString() ?? "This is a Demo response";
  const responseAudio = await generateAudio(line);
  gameEvents.publishAction({
    kind: "chat",
    chat: {
      name: "Herika",
      message: line,
      audio: responseAudio,
    },
  });
  res.sendStatus(200);
});
ui.get("/api/sayAsPlayer", async (req, res) => {
  const line = req.query["text"]?.toString() ?? "This is a Demo response";
  gameEvents.logEvent({
    kind: "chat",
    chat: {
      name: "Player",
      message: line,
    },
  });
  res.sendStatus(200);
});

ui.use((req, res) => {
  const url = req.url.split(/[?#]/)[0];
  res.header(
    "content-type",
    url.endsWith(".js") ? "text/javascript" : "text/html",
  );
  nodeFs.createReadStream(nodePath.resolve("./ui/" + url)).pipe(res);
});
