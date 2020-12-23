import logger from "../../common/logger.js";
import client from "../../common/client.js";

import { Comment, Submission } from "snoowrap";
import { mirrorComment } from "./comment.js";
import { mirrorPost } from "./post.js";
import { alreadyReplied, buildMentionReply } from "../../common/util.js";
import { isComment, isSubmission } from "../../common/types.js";

// @ts-expect-error: Pending not-an-aardvark/snoowrap#221
async function getParent(comment: Comment): Promise<Comment | Submission> {
  const parentName = comment.parent_id;
  const type = parentName.slice(0, 2);
  const id = parentName.slice(3);

  switch (type) {
    case "t1":
      // @ts-expect-error: Pending not-an-aardvark/snoowrap#221
      return await client.getComment(id).fetch();
    case "t3":
      // @ts-expect-error: Pending not-an-aardvark/snoowrap#221
      return await client.getSubmission(id).fetch();
    default:
      logger.error(
        `Somehow found a comment with the parent '${parentName}', this shouldn't have happened...`,
        { comment: comment.id }
      );
      return null;
  }
}

export default async function processMention(commentId: string): Promise<void> {
  const log = logger.child({ mention: commentId });
  log.info("Processing mention");

  // @ts-expect-error: Pending not-an-aardvark/snoowrap#221
  const mention: Comment = await client.getComment(commentId).fetch();
  if (await alreadyReplied(mention)) {
    log.info("Already replied, ignoring.");
    return;
  }

  let item: Comment | Submission = mention;
  while (isComment(item)) {
    log.info("Checking comment for links", { comment: item.id });
    const { status, albums } = await mirrorComment(item);
    const msg = buildMentionReply(status, albums);
    if (msg != null) {
      log.info("Mirrored comment", { comment: item.id, status, albums });
      mention.reply(msg);
      return;
    }

    // @ts-expect-error: Pending not-an-aardvark/snoowrap#221
    item = await getParent(item);
  }

  if (!isSubmission(item)) {
    log.error(
      "Somehow got an item that isn't a submission. Something has gone horribly wrong."
    );
    return;
  }

  const { status, albums } = await mirrorPost(item);
  const msg = buildMentionReply(status, albums);
  if (msg != null) {
    log.info("Mirrored post", { post: item.id, status, albums });
    mention.reply(msg);
    return;
  }

  log.info("Did not reply to mention");
}
