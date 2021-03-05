import { Comment, Listing, VoteableContent } from "snoowrap";
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
  return c.author.name.toLowerCase() === process.env.REDDIT_USER.toLowerCase();
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

export function buildDmSubject(): string {
  let subject = "Bot Error";
  let trace = getTraceUUID();
  if (trace) {
    subject += ` (trace: ${trace})`;
  }
  return subject;
}

function getFooterLinks(): string {
  const subject = encodeURIComponent(buildDmSubject());
  const links = [
    `[bot-error]: https://www.reddit.com/message/compose/?to=bluecomm403&subject=${subject}`,
    "[github]: https://github.com/",
  ];
  return links.join("\n");
}

export function addFooter(msg: string): string {
  return `${msg}\n\n---\n^(Beep boop, I'm a bot. This action was performed automatically. | Did I do something wrong? [Message my creator][bot-error] | Check out my source code on [GitHub][github]!)\n\n${getFooterLinks()}`;
}

/**
 * Build a comment for a given message.
 *
 * @param albums The links to one or more mirror albums.
 *
 * @returns The final comment.
 */
export function buildComment(albums: string[]): string {
  let msg = "";
  if (albums.length === 1) {
    msg = `I noticed you linked to an 18+ Pixiv post. Those require a Pixiv account to view, so [here](${albums[0]}) is a mirror.`;
  } else {
    msg = `I noticed you linked to some 18+ Pixiv posts. Those require a Pixiv account to view, so here are some mirrors:`;
    for (const album of albums) {
      msg += `\n1. [mirror](${album})`;
    }
  }

  return addFooter(msg);
}

/**
 * Build a comment for a given message.
 *
 * @param album The link to the mirror album.
 *
 * @returns The final comment.
 */
export function buildRemovalComment(album: string): string {
  let msg = `Directly linking to 18+ Pixiv posts is not allowed because they require a Pixiv account to view. Please make a new post from [this mirror](${album}) instead.`;
  return addFooter(msg);
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
    case "no mirror":
      return "I found one or more pixiv links, but I was unable to mirror them. Most likely they are not behind an account wall.";
    case "no match":
    default:
      return null;
  }
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
