/**
 * Check if the bot has already replied to a given post/comment.
 *
 * @param {VoteableContent} content The post/comment to check replies of.
 *
 * @returns {boolean} Whether or not the bot has already replied.
 */
export async function alreadyReplied(content) {
  const e = await content.expandReplies({ depth: 1 });
  const r = e.comments || e.replies;
  return r.some((c) => c.author.name === process.env.REDDIT_USER);
}

/**
 * Build a comment for a given message.
 *
 * @param {string[]} albums The links to one or more mirror albums.
 *
 * @returns {string} The final comment.
 */
export function buildComment(albums) {
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
