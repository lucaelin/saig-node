import { Buffer } from "node:buffer";
// @deno-types="npm:@types/express@4.17.15"
import express, { Router } from "npm:express";
import multipart from "npm:connect-multiparty";
import { transcribeAudio } from "./audio.ts";
import { GameAction, GameEvent, gameEvents } from "./events.ts";
import { Md5 } from "https://deno.land/std@0.95.0/hash/md5.ts";
const multipartMiddleware = multipart();

const app = express();
const gw = Router();

const soundcache: Record<string, Uint8Array> = {};

function parseEvent(eventString: string): GameEvent {
  const [kind, ts, gameTs, message] = eventString.split("|");
  const context = (message.trim().match(/\(([^)]|\)\()*\)/) ?? []).at(0);
  const messageClean = message.trim().slice((context ?? "").length).trim();
  return {
    kind,
    timestamp: parseFloat(ts) / 1000000000,
    gameTimestamp: parseFloat(gameTs),
    context: context
      ? {
        location: (context.match(/Context location: ([^,)]*)/) ?? []).at(1) ||
          undefined,
        npcs: (context.match(/see this beings in range:([^ )]*)/))?.at(1)
          ?.split(",").filter((v) => v) || undefined,
      }
      : undefined,
    message: messageClean,
    chat: messageClean
      ? {
        name: messageClean.split(":")[0],
        message: messageClean.split(":").slice(1).join(":"),
        background: context?.includes("background chat") ?? false,
      }
      : undefined,
  };
}

function stringifyAction(action: GameAction): string {
  return [action.actor, action.action, action.input].join("|");
}

function generateActionResponse(e: CustomEvent<GameAction>) {
  const action = e as CustomEvent<GameAction>;
  const responseAudioFileName =
    new Md5().update(action.detail.input).toString() +
    ".wav";
  if (action.detail.audio) {
    soundcache[responseAudioFileName] = action.detail.audio;
  }

  const toPublish = gameEvents.popPendingActions();
  const response = toPublish.map(stringifyAction).join("\r\n");
  console.log("publishing", response);
  return response;
}

gw.get("/comm.php", (req, res) => {
  const data = atob(req.query.DATA as string);
  const event = parseEvent(data);
  console.log(event);
  gameEvents.logEvent(event);

  if (["book"].includes(event.kind)) {
    gameEvents.addEventListener("action", (e) => {
      const response = generateActionResponse(e as CustomEvent<GameAction>);
      res.send(response + "\r\nX-CUSTOM-CLOSE\r\n");
    }, { once: true });
  } else {
    res.sendStatus(200);
  }

  // may also send at any time:
  // Player|Simchat|Twitch Chat User randomName23 said "i need you to ask me two quesitons in succession, simply respond!"
});

gw.post("/stt.php", multipartMiddleware, async (req, res) => {
  const upload =
    (req as unknown as { files: Record<string, { path: string }> }).files.file;
  const audio = await Deno.readFile(upload.path);
  const text = await transcribeAudio(audio);
  res.send(text);
});

gw.get("/stream.php", (req, res) => {
  const data = atob(req.query.DATA as string);
  // inputtext|366531088273800|636306688|(Context location: )Rude:Tommyjog

  const event = parseEvent(data);
  console.log(event);
  gameEvents.logEvent(event);

  gameEvents.addEventListener("action", (e) => {
    const response = generateActionResponse(e as CustomEvent<GameAction>);
    res.send(response + "\r\nX-CUSTOM-CLOSE\r\n");
  }, { once: true });
});

gw.get("/soundcache/:hash", (req, res) => {
  const file = soundcache[req.params.hash];
  console.log("access soundcache", req.params.hash);
  if (!file) return res.sendStatus(404);
  console.log("soundcache hit");
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
