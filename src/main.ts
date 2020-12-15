// This import must be first to ensure that environment variables are set up.
import { version } from "./config.js";

import log, { clsWrap } from "./logger.js";
import Snoowrap from "snoowrap";
import Bluebird from "bluebird";
import processComment from "./process/comment.js";
import processPost from "./process/post.js";
import * as db from "./database.js";
import * as web from "./web.js";
import * as keepalive from "./keepalive.js";
import { CommentStream, SubmissionStream } from "snoostorm";

const streamOpts = {
  subreddit: "BluesTestingGround",
  pollTime: 10000, // Every 10 minutes, to start
};

const client = new Snoowrap({
  userAgent: `bot:${process.env.REDDIT_USER}:${version} (by /u/bluecomm403)`,
  clientId: process.env.REDDIT_CLIENT,
  clientSecret: process.env.REDDIT_SECRET,
  username: process.env.REDDIT_USER,
  password: process.env.REDDIT_PASS,
});
client.config({ continueAfterRatelimitError: true });

(async () => {
  log.info(`Starting PixivMirrorBot v${version}`);
  await db.init();
  await web.start();
  await keepalive.start();

  const posts = new SubmissionStream(client, streamOpts);
  posts.on("item", (p) => clsWrap(() => processPost(p)));

  const comments = new CommentStream(client, streamOpts);
  comments.on("item", (c) => clsWrap(() => processComment(c)));

  /**
   * Perform a clean shutdown of the system.
   *
   * @param signal The signal that caused the shutdown.
   */
  function shutdown(signal: NodeJS.Signals) {
    log.info(`Received ${signal}, shutting down...`);
    Bluebird.all([posts.end(), comments.end(), web.stop(), keepalive.stop()])
      // Only close the database after everything else is done, just in case.
      .then(() => db.stop())
      .then(() => process.exit(0));
  }

  // Perform a clean shutdown on SIGINT/SIGTERM
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
})();
