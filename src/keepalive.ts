import got from "got";
import { sublog, clsWrap } from "./logger.js";
import { port } from "./util.js";

const log = sublog("keepalive");

// Timeout between keepalive requests (25 minutes).
const interval = 25 * 60 * 1000;
const url = new URL(
  "/api/v1/ping",
  process.env.KEEPALIVE_HOST || `http://localhost:${port}`
).toString();
log.debug(`keepalive url: ${url}`);

async function ping() {
  try {
    log.info("Sending keepalive request");
    const res = await got.get(url);
    log.info("Keepalive request successful", { res: res.body });
    setTimeout(keepalive, interval);
  } catch (e) {
    // Something went wrong, log and try again in 10s.
    log.error("Keepalive request errored", e);
    setTimeout(keepalive, 10 * 1000);
  }
}

function keepalive() {
  clsWrap(ping);
}

setTimeout(keepalive, interval);
