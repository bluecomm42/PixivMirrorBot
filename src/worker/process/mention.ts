import logger from "../../common/logger.js";
import client from "../../common/client.js";

import { Comment, Submission } from "snoowrap";
import { mirrorComment } from "./comment.js";
import { mirrorPost } from "./post.js";
import {
  addFooter,
  alreadyReplied,
  buildMentionReply,
} from "../../common/util.js";
import { isComment, isSubmission } from "../../common/types.js";
import { Logger } from "winston";
import { disabled, disabledMsg } from "../../common/config.js";

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

async function _processMention(mention: Comment, log: Logger): Promise<string> {
  let item: Comment | Submission = mention;
  while (isComment(item)) {
    log.info("Checking comment for links", { comment: item.id });
    const { status, albums } = await mirrorComment(item);
    const msg = buildMentionReply(status, albums);
    if (msg != null) {
      log.info("Mirrored comment", { comment: item.id, status, albums });
      return msg;
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
    return msg;
  } else {
    log.info("Unable to find any pixiv links to mirror");
    return "Thanks for calling your local Pixiv bot. Unfortunately I was unable to find any pixiv links in this thread.";
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

  if (disabled) {
    const msg = disabledMsg + " [](#pmb-mark--disabled-msg)";
    // @ts-expect-error: Pending not-an-aardvark/snoowrap#221
    await mention.reply(addFooter(msg, mention.permalink));
    log.info("Replied to mention with disabled message.");
  } else {
    const msg = await _processMention(mention, log);
    // @ts-expect-error: Pending not-an-aardvark/snoowrap#221
    await mention.reply(addFooter(msg, mention.permalink));
    log.info("Replied to mention.");
  }
}
