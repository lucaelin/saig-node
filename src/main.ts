// @deno-types="npm:@types/express@4.17.15"
import express from "npm:express";
import "./ai.ts";
import { gw } from "./saig.ts";
import { gameEvents } from "./events.ts";
import { generateAudio } from "./audio.ts";

const app = express();

app.use("/saig-gwserver", gw);
app.use("//saig-gwserver", gw);

gw.get("/say", async (req, res) => {
  const line = req.query["text"]?.toString() ?? "This is a Demo response";
  const responseAudio = await generateAudio(line);
  gameEvents.publishAction({
    actor: "Herika",
    action: "AASPGQuestDialogue2Topic1B1Topic",
    input: line,
    audio: responseAudio,
  });
  res.sendStatus(200);
});

app.all("*", (req, res) => {
  console.log("UNEXPECTED REQUEST:", req.method, req.url, req.baseUrl);
  res.sendStatus(404);
});
app.listen(8080, "127.0.0.1", () => {
  console.log("server started");
});
