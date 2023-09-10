// @deno-types="npm:@types/express@4.17.15"
import {Router} from "npm:express";
import {Buffer} from "node:buffer";
import multipart from "npm:connect-multiparty";
import {transcribeAudio} from "./audio.ts";
import {GameAction, GameEvent, gameEvents} from "./events.ts";
import {Md5} from "https://deno.land/std@0.95.0/hash/md5.ts";

const multipartMiddleware = multipart();

export const gw = Router();
const soundcache: Record<string, Uint8Array> = {};

export function parseEvent(eventString: string): GameEvent {
  const [kind, ts, gameTs, message] = eventString.split("|");
  const context = (message.trim().match(/\(([^)]|\)\()*\)/) ?? []).at(0);
  const messageClean = message.trim().slice((context ?? "").length).trim();
  let event: GameEvent = {
    kind: "unknown",
    gameKind: kind,
    timestamp: parseFloat(ts) / 1000000000,
    gameTimestamp: parseFloat(gameTs),
    payload: message,
  };
  if (["infoloc", "infonpc", "request"].includes(kind)) {
    event = {
      ...event,
      kind: "context",
      context: context
        ? JSON.parse(JSON.stringify({
          location:
            (context.match(/Context location: ([^,)]*)/) ?? []).at(1)?.trim() ||
            undefined,
          date: (context.match(/Current Date in Skyrim World: ([^)]*)/))?.at(1)
            ?.trim() ||
            undefined,
          npcs: (context.match(/beings are currently visible:([^)]*)/))?.at(1)
            ?.split(",").map((v) => v.trim()).filter((v) => v) || undefined,
          pois: (context.match(/can see this buildings to go:(.*),,/))?.at(1)
            ?.split(",").map((v) => v.trim()).filter((v) => v) || undefined,
        }))
        : undefined,
    };
  }
  /*if (["chat", "chatnf", "inputtext"].includes(kind)) {
    event = {
      ...event,
      kind: "chat",
      chat: {
        name: messageClean.split(":")[0],
        message: messageClean.split(":").slice(1).join(":"),
        background: context?.includes("background chat") ?? false,
      },
    };
  }*/
  if (["book"].includes(kind)) {
    event = {
      ...event,
      kind: "book",
      title: messageClean,
    };
  }
  if (["_speech"].includes(kind)) {
    const speechData = JSON.parse(messageClean);
    event = {
      ...event,
      kind: "chat",
      chat: {
        name: speechData.speaker,
        message: speechData.speech,
        background: false,
      },
    };
  }
  if (["goodnight", "goodmorning"].includes(kind)) {
    event = {
      ...event,
      kind: "sleep",
      asleep: kind === "goodnight",
    };
  }
  return event;
}

function convertAction(action: GameAction): string {
  if (action.kind === "chat") {
    if (action.chat.name === "Player") {
      return [
        action.chat.name,
        "Simchat",
        action.chat.message,
      ].join("|");
    }
    return [
      action.chat.name,
      "AASPGQuestDialogue2Topic1B1Topic",
      action.chat.message,
    ].join("|");
  }
  return "";
}

function generateActionResponse() {
  const toPublish = gameEvents.popPendingActions();
  toPublish.forEach((a) => {
    if (a.kind === "chat") {
      soundcache[new Md5().update(a.chat.message).toString() + ".wav"] = a.chat
        .audio!;
    }
  });
  return toPublish.map(convertAction).join("\r\n");
}

gw.get("/comm.php", (req, res) => {
  const data = atob(req.query.DATA as string).replaceAll('\r', '');
  console.log("incoming", data);
  const event = parseEvent(data);
  gameEvents.logEvent(event);

  const additionalResponse =
    ["request", "infoloc", "infonpc"].includes(event.kind)
      ? ""
      : "\r\nHerika|command|Inspect@nothing";

  const response = generateActionResponse() + additionalResponse;
  console.log("outgoing", response);
  res.chunkedEncoding = true;
  res.contentType("text/html; charset=UTF-8");
  res.send(response + "\r\nX-CUSTOM-CLOSE");
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

gw.get("/streamv2.php", (req, res) => {
  const data = atob(req.query.DATA as string).replaceAll('\r', '');
  // inputtext|366531088273800|636306688|(Context location: )Rude:Tommyjog
  console.log("incoming (stream)", data);

  const event = parseEvent(data);
  gameEvents.logEvent(event);

  res.chunkedEncoding = true;
  res.contentType("text/html; charset=UTF-8");

  gameEvents.addEventListener("action", (_e) => {
    const response = generateActionResponse();
    console.log("outgoing (stream)", response);
    res.send(
      response + "\r\nX-CUSTOM-CLOSE\r\n",
    );
  }, { once: true });
});

const dummyaudio = await Deno.readFile("./res/dummyaudio.wav");

gw.get("/soundcache/:hash", (req, res) => {
  const file = soundcache[req.params.hash];
  console.log("access soundcache", req.params.hash);
  if (!file) {
    res.contentType("audio/x-wav");
    res.send(Buffer.from(dummyaudio));
    return;
  }
  console.log("soundcache hit");
  res.contentType("audio/x-wav");
  res.send(Buffer.from(file));
});
