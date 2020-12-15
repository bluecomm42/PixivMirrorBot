import express from "express";
import { sublog } from "./logger.js";
import { port } from "./util.js";
import { Server } from "http";
import Bluebird from "bluebird";

const logger = sublog("webserver");

const app = express();

app.get("/", (req, res) => {
  res.send(
    'This is a temporary landing page for <a href="https://reddit.com/u/PixivMirrorBot">u/PixivMirrorBot</a>'
  );
});

app.get("/api/v1/ping", (req, res) => res.send("pong"));

let server: Server;

/**
 * Start the webserver.
 */
export async function start(): Promise<void> {
  return new Promise((resolve) => {
    server = app.listen(port, () => {
      logger.info(`Webserver started on port ${port}`);
      resolve();
    });
  });
}

/**
 * Stop the webserver.
 */
export async function stop(): Promise<void> {
  if (!server) return;
  logger.info("Shutting down webserver");
  const close = Bluebird.promisify(server.close.bind(server));
  await close();
  logger.info("Webserver shut down successfully");
}
