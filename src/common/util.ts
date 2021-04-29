import { Comment, Listing, Submission, VoteableContent } from "snoowrap";
import { disabled } from "./config.js";
import { Timestamps, CombinedTimestamps } from "./database.js";
import { getTraceUUID } from "./logger.js";
import { Statuses } from "./types.js";

class Replyable {
  comments?: Listing<Comment>;
  replies?: Listing<Comment>;
}

// Test link: regexr.com/5hoq5
export const regexBase = /https?:\/\/(?:(?:www\.)?pixiv|i\.pximg)\.net\/(?:(?:\w+\/)?artworks\/|member_illust\.php\?.*?illust_id=|.*?\/img\/\d{4}(?:\/\d\d){5}\/)(\d+)/;

/** The port to run the webserver on */
export const port = process.env.PORT || 8080;

/**
 * Check whether or not a particular comment was made by this bot.
 *
 * @param c The comment to check.
 *
 * @returns Whether or not the comment was made by this bot.
 */
export function myComment(c: Comment): boolean {
  // If the author is different, it's not our comment.
  if (c.author.name.toLowerCase() !== process.env.REDDIT_USER.toLowerCase())
    return false;

  // If the comment was by us but it was made while disabled and we're not
  // disabled anymore, let the bot re-reply.
  return !disabled && c.body.includes("pmb-mark--disabled-msg");
}

/**
 * Check whether a comment contains a mention of this bot (u/<bot name>)
 *
 * @param c The comment to check.
 *
 * @returns Whether or not the comment mentions this bot.
 */
export function mentionsMe(c: Comment): boolean {
  const mention = `u/${process.env.REDDIT_USER}`.toLowerCase();
  return c.body.toLowerCase().includes(mention);
}

/**
 * Checks whether or not the item was made by an ignored user.
 *
 * @param cmnt The comment to check.
 *
 * @returns Whether or not the author is ignored.
 */
export function ignoredUser(cmnt: Comment): boolean {
  // TODO: Allow subreddits to add their own ignore lists.
  // TODO: Allow users to opt-out globally.
  const ignored = ["2dgt3d"];
  return myComment(cmnt) || ignored.includes(cmnt.author.name.toLowerCase());
}

/**
 * Check if the bot has already replied to a given post/comment.
 *
 * @param content The post/comment to check replies of.
 *
 * @returns Whether or not the bot has already replied.
 */
export async function alreadyReplied<T>(
  content: VoteableContent<T>
): Promise<boolean> {
  const e: Replyable = await content.expandReplies({ depth: 1 });
  const r = e.comments || e.replies;
  return r.some(myComment);
}

export function buildDmMessage(contextUrl: string): string {
  let message = `[Context](${contextUrl})`;
  let trace = getTraceUUID();
  if (trace) message += ` (trace: ${trace})`;
  return message;
}

function getFooterLinks(contextUrl: string): string {
  const message = encodeURIComponent(buildDmMessage(contextUrl));
  const links = [
    `[bot-error]: https://www.reddit.com/message/compose/?to=bluecomm403&subject=Bot%20Error&message=${message}`,
    "[github]: https://github.com/bluecomm42/PixivMirrorBot",
  ];
  return links.join("\n");
}

export function addFooter(msg: string, contextUrl: string): string {
  const links = getFooterLinks(contextUrl);
  return `${msg}\n\n---\n^(Beep boop, I'm a bot. This action was performed automatically. | Did I do something wrong? [Message my creator][bot-error] | Check out my source code on [GitHub][github]!)\n\n${links}`;
}

/**
 * Build a comment for a given message.
 *
 * @param albums The links to one or more mirror albums.
 *
 * @returns The final comment.
 */
export function buildComment(albums: string[], contextUrl: string): string {
  let msg = "";
  if (albums.length === 1) {
    msg = `I noticed you linked to an 18+ Pixiv post. Those require a Pixiv account to view, so [here](${albums[0]}) is a mirror.`;
  } else {
    msg = `I noticed you linked to some 18+ Pixiv posts. Those require a Pixiv account to view, so here are some mirrors:`;
    for (const album of albums) {
      msg += `\n1. [mirror](${album})`;
    }
  }

  return addFooter(msg, contextUrl);
}

/**
 * Build a comment for a given message.
 *
 * @param album The link to the mirror album.
 *
 * @returns The final comment.
 */
export function buildRemovalComment(album: string, contextUrl: string): string {
  let msg = `Directly linking to 18+ Pixiv posts is not allowed because they require a Pixiv account to view. Please make a new post from [this mirror](${album}) instead.`;
  return addFooter(msg, contextUrl);
}

export function buildMentionReply(
  status: Statuses,
  albums: string[]
): string | null {
  switch (status) {
    case "ok":
      if (albums.length === 1) {
        return `[Here](${albums[0]}) is the mirror you requested!`;
      } else {
        let msg = `Here are the mirrors you requested!`;
        for (const album of albums) {
          msg += `\n1. [mirror](${album})`;
        }
        return msg;
      }
    case "only unrestricted":
      return "I found one or more pixiv links, but none of them were behind an account wall. If you believe this is wrong, please message my creator.";
    case "error":
      return "I found one or more pixiv links, but I was unable to mirror them due to an error.";
    case "no match":
    default:
      return null;
  }
}

export function mdCodeBlock(code: string): string {
  return "```\n" + code + "\n```";
}

/**
 * Dedupe a given array.
 *
 * @param arr The array to dedupe.
 */
export function dedupe<T>(arr: Array<T>): Array<T> {
  return [...new Set(arr)];
}

export function extractTimestamps(
  ts: CombinedTimestamps,
  key: "post" | "comment"
): Timestamps {
  const out: Timestamps = {};
  for (const sub in ts) {
    out[sub] = ts[sub][key];
  }
  return out;
}

export function mergeTimestamps(
  posts: Timestamps,
  comments: Timestamps
): CombinedTimestamps {
  const out: CombinedTimestamps = {};
  // Dedupe object keys
  const keys = dedupe([...Object.keys(posts), ...Object.keys(comments)]);
  for (const key of keys) {
    out[key] = {
      post: posts[key] || 0,
      comment: comments[key] || 0,
    };
  }
  return out;
}
