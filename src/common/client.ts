import { version } from "./config.js";
import Snoowrap from "snoowrap";

const client = new Snoowrap({
  userAgent: `bot:${process.env.REDDIT_USER}:${version} (by /u/bluecomm403)`,
  clientId: process.env.REDDIT_CLIENT,
  clientSecret: process.env.REDDIT_SECRET,
  username: process.env.REDDIT_USER,
  password: process.env.REDDIT_PASS,
});
client.config({
  continueAfterRatelimitError: true,
  debug: process.env.NODE_ENV !== "production",
  proxies: false,
});

export default client;
