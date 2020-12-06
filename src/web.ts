import express from "express";
import { sublog } from "./logger.js";
import { port } from "./util.js";

const logger = sublog("webserver");

const app = express();

app.get("/", (req, res) => {
  res.send(
    'This is a temporary landing page for <a href="https://reddit.com/u/PixivMirrorBot">u/PixivMirrorBot</a>'
  );
});

app.get("/api/v1/ping", (req, res) => res.send("pong"));

app.listen(port, () => {
  logger.info(`Webserver started on port ${port}`);
});
