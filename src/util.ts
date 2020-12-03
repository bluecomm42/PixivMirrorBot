import { Comment, Listing, VoteableContent } from "snoowrap";

class Replyable {
  comments?: Listing<Comment>;
  replies?: Listing<Comment>;
}

export const regexBase =
  "https?://(?:www\\.)?pixiv\\.net/(?:(?:\\w+/)?artworks/|member_illust\\.php\\?.*?illust_id=)(\\d+)";

/**
 * Check whether or not a particular comment was made by this bot.
 *
 * @param c The comment to check.
 *
 * @returns Whether or not the comment was made by this bot.
 */
export function myComment(c: Comment): boolean {
  return c.author.name === process.env.REDDIT_USER;
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

  // TODO: Add bot info footer.
  return `${msg}\n\n---\n^(Beep boop, I'm a bot. This action was performed automatically. | Did I do something wrong? [Message my creator][bot-error] | Check out my source code on [GitHub][github]!)\n\n[bot-error]: https://www.reddit.com/message/compose/?to=bluecomm403&subject=Bot%20Error\n[github]: https://github.com/`;
}

/**
 * Dedupe a given array.
 *
 * @param arr The array to dedupe.
 * @param hasher The function to use to hash each entry to tell them apart. Defaults to JSON.stringify.
 */
export function dedupe<T>(
  arr: Array<T>,
  hasher: (itm: any) => any = JSON.stringify
): Array<T> {
  const clone = [];
  const lookup: { [key: string]: boolean } = {};

  for (let i = 0; i < arr.length; i++) {
    let elem = arr[i];
    let hashed = hasher(elem);

    if (!lookup[hashed]) {
      clone.push(elem);
      lookup[hashed] = true;
    }
  }

  return clone;
}
