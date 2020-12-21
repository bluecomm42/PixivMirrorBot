import { queueName } from "../common/config.js";
import express from "express";
import basicAuth from "express-basic-auth";
import { sublog } from "../common/logger.js";
import { port } from "../common/util.js";
import { Server } from "http";
import Arena from "bull-arena";
import Bluebird from "bluebird";
import { Queue } from "bullmq";

const logger = sublog("webserver");

const arena = Arena(
  {
    BullMQ: Queue,
    queues: [
      {
        type: "bullmq",
        name: queueName,
        hostId: process.env.REDDIT_USER,
        url: process.env.REDIS_URL,
      },
    ],
  },
  {
    disableListen: true,
    basePath: "/queue",
  }
);

const app = express();

app.get("/", (req, res) => {
  const user = process.env.REDDIT_USER;
  res.send(
    `This is a temporary landing page for <a href="https://reddit.com/u/${user}">u/${user}</a>`
  );
});

const users = { admin: process.env.ADMIN_PASS };
const authOpts = { users, challenge: true, realm: "queue" };
app.use(["/queue", "/queue/*"], basicAuth(authOpts));
app.use("/", arena);
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
