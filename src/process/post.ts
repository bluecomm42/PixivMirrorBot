import logger from "../logger.js";
import mirror from "../pixiv-mirror.js";
import { alreadyReplied, buildComment, regexBase } from "../util.js";
import { Submission } from "snoowrap";

const postRegex = new RegExp(`^${regexBase}`);

/**
 * Process a post.
 *
 * @param post The post to process.
 */
export default async function processPost(post: Submission): Promise<void> {
  const log = logger.child({ post: post.id });
  log.info("Processing post");

  if (post.archived) {
    log.info("Post is archived, ignoring");
    return;
  }
  const m = post.url.match(postRegex);
  if (m == null) {
    log.info({ postUrl: post.url }, "Post url isn't Pixiv");
    return;
  }
  if (await alreadyReplied(post)) {
    log.info("Already replied to post");
    return;
  }

  const id = parseInt(m[1]);
  const album = await mirror(id);
  if (album == null) {
    log.info("No mirror created");
    return;
  }

  const msg = buildComment([album]);
  // @ts-expect-error: Pending not-an-aardvark/snoowrap#221
  const reply = await post.reply(msg);
  log.info({ replyId: reply.id }, "Successfuly replied to post");

  await reply.distinguish({ status: true, sticky: true });
}
