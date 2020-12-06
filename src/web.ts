import { sublog } from "./logger.js";
import express from "express";
import { port } from "./util.js";

const logger = sublog("webserver");

const app = express();

app.get("/", (req, res) => {
  res.send(
    'This is a temporary landing page for <a href="https://reddit.com/u/PixivMirrorBot">u/PixivMirrorBot</a>'
  );
});

app.listen(port, () => {
  logger.info(`Webserver started on port ${port}`);
});
