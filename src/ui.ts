// @deno-types="npm:@types/express@4.17.15"
import express, { Router } from "npm:express";
import nodeFs from "node:fs";
import nodePath from "node:path";
import {gameEvents} from "./events.ts";
export const ui = Router();

ui.get("/api/history", (req, res) => {
  res.send(gameEvents.getEventLog());
});

ui.use((req, res) => {
  const url = req.url.split(/[?#]/)[0];
  res.header(
    "content-type",
    url.endsWith(".js") ? "text/javascript" : "text/html",
  );
  nodeFs.createReadStream(nodePath.resolve("./ui/" + url)).pipe(res);
});
