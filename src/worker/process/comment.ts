import logger from "../../common/logger.js";
import mirror from "../pixiv-mirror.js";
import client from "../../common/client.js";
import Bluebird from "bluebird";

import {
  alreadyReplied,
  buildComment,
  dedupe,
  myComment,
  mentionsMe,
  regexBase,
  ignoredUser,
} from "../../common/util.js";
import { Comment } from "snoowrap";
import { Mirror } from "../../common/types.js";

const commentRegex = new RegExp(regexBase, "g");

/**
 * Mirrors a single comment.
 *
 * @param comment The comment to process.
 */
export async function mirrorComment(comment: Comment): Promise<Mirror> {
  const log = logger.child({ comment: comment.id });
  log.info("Mirroring comment");

  const matches = comment.body.matchAll(commentRegex);
  const foundIds = Array.from(matches, m => parseInt(m[1]));
  if (foundIds.length === 0) {
    log.info("Found no matches");
    return { status: "no match", albums: [] };
  }

  const ids = dedupe(foundIds);
  log.info("Processing matches", { matches: ids });

  const mirrors = await Bluebird.resolve(ids).map(mirror);

  const albums: string[] = [];
  for (const mirror of mirrors) {
    switch (mirror.status) {
      case "failed":
        // If any of the mirrors failed, we too have failed.
        // TODO: Clean up the other albums?
        return { status: "error", albums: [] };
      case "ok":
        albums.push(mirror.album);
        break;
      case "unrestricted":
      default:
        continue;
    }
  }

  // If all of the posts we tried to mirror were unrestricted, reflect that.
  const status = albums.length === 0 ? "only unrestricted" : "ok";
  return { status, albums };
}

export default async function processComment(commentId: string): Promise<void> {
  const log = logger.child({ comment: commentId });
  log.info("Processing comment");

  // @ts-expect-error: Pending not-an-aardvark/snoowrap#221
  const comment: Comment = await client.getComment(commentId).fetch();

  // Ignore any comments made by this bot to avoid accidental loops.
  if (myComment(comment)) {
    log.info("Comment was made by me, ignoring");
    return;
  }
  if (comment.archived) {
    log.info("Comment is archived, ignoring");
    return;
  }
  if (ignoredUser(comment)) {
    log.info("Comment was made by an ignored user, ignoring");
    return;
  }
  if (await alreadyReplied(comment)) {
    log.info("Already replied to comment");
    return;
  }
  if (mentionsMe(comment)) {
    // Mentions are processed specially, don't put it through the normal flow.
    log.info("Comment is a mention");
    return;
  }

  const { status, albums } = await mirrorComment(comment);
  if (status !== "ok") {
    log.info("Unable to mirror", { status });
    return;
  }

  const msg = buildComment(albums, comment.permalink);
  // @ts-expect-error: Pending not-an-aardvark/snoowrap#221
  const reply = await comment.reply(msg);
  log.info("Successfuly replied to post", { replyId: reply.id });
}
