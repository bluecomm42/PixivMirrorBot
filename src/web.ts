import { sublog } from "./logger.js";
import express from "express";

const logger = sublog("webserver");

const app = express();
const port = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send(
    'This is a temporary landing page for <a href="https://reddit.com/u/PixivMirrorBot">u/PixivMirrorBot</a>'
  );
});

app.listen(port, () => {
  logger.info(`Webserver started on port ${port}`);
});
