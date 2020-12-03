// This import must be first to ensure that environment variables are set up.
import { version } from "./config.js";

import "./web.js";
import log from "./logger.js";
import Snoowrap from "snoowrap";
import processComment from "./process/comment.js";
import processPost from "./process/post.js";
import { init as dbInit } from "./database.js";
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
  await dbInit();

  const posts = new SubmissionStream(client, streamOpts);
  posts.on("item", processPost);

  const comments = new CommentStream(client, streamOpts);
  comments.on("item", processComment);
})();
