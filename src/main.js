import { version } from "./config.js";
import "./web.js";
import mirror from "./pixiv-mirror.js";
import { alreadyReplied, buildComment } from "./util.js";

import Promise from "bluebird";
import Snoowrap from "snoowrap";
import { CommentStream, SubmissionStream } from "snoostorm";

const regexBase = "https?://(?:www\\.)?pixiv\\.net/(?:\\w+/)?artworks/(\\d+)";
const commentRegex = new RegExp(regexBase, "g");
const postRegex = new RegExp(`^${regexBase}`);

const streamOpts = {
  subreddit: "BluesTestingGround",
  pollTime: 10000, // Every 10 minutes, to start
};

console.log(`Starting PixivMirrorBot v${version}...`);
const client = new Snoowrap({
  userAgent: `bot:PixivMirrorBot:${version} (by /u/bluecomm403)`,
  clientId: process.env.REDDIT_CLIENT,
  clientSecret: process.env.REDDIT_SECRET,
  username: process.env.REDDIT_USER,
  password: process.env.REDDIT_PASS,
});
client.config({ continueAfterRatelimitError: true });

const posts = new SubmissionStream(client, streamOpts);
posts.on("item", async (post) => {
  const m = post.url.match(postRegex);
  if (m == null) return;
  if (await alreadyReplied(post)) return;

  const id = parseInt(m[1]);
  if (isNaN(id)) return;

  const album = await mirror(id);
  if (album == null) return;

  const msg = buildComment([album]);
  const reply = await post.reply(msg);
  await reply.distinguish({ status: true, sticky: true });
});

const comments = new CommentStream(client, streamOpts);
comments.on("item", async (comment) => {
  const ids = Array.from(comment.body.matchAll(commentRegex), (m) => m[1]);
  if (ids.length === 0) return;
  if (await alreadyReplied(comment)) return;

  const albums = await Promise.resolve(ids)
    .map(mirror)
    .filter((e) => e != null);
  if (albums.length === 0) return;

  const msg = buildComment(albums);
  await comment.reply(msg);
});
