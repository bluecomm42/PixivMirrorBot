import logger from "../../common/logger.js";
import mirror from "../pixiv-mirror.js";
import client from "../../common/client.js";
import {
  alreadyReplied,
  buildComment,
  buildRemovalComment,
  regexBase,
} from "../../common/util.js";
import { Submission, Subreddit } from "snoowrap";
import { Mirror } from "../../common/types.js";

const postRegex = new RegExp(`^${regexBase.source}`);

interface PostActions {
  remove: boolean;
  distinguish: boolean;
  sticky: boolean;
}

async function getActions(post: Submission): Promise<PostActions> {
  // TODO: fetch this info from the database on a per-sub basis.
  // const removePosts = true;
  // if (!removePosts) return { remove: false, distinguish: false, sticky: false };

  // @ts-expect-error: Pending not-an-aardvark/snoowrap#221
  const subreddit: Subreddit = await post.subreddit.fetch();
  const mods = subreddit.getModerators({ name: process.env.REDDIT_NAME });
  if (mods.length == 0) {
    // We are not a mod, can't remove even if we want to!
    return { remove: false, distinguish: false, sticky: false };
  } else {
    // We're a mod! Get rid of that sucker.
    return { remove: true, distinguish: true, sticky: true };
  }
}

/**
 * Mirrors a post.
 *
 * @param post The post to mirror.
 */
export async function mirrorPost(post: Submission): Promise<Mirror> {
  const log = logger.child({ post: post.id });
  log.info("Mirroring post");

  const m = post.url.match(postRegex);
  if (m == null) {
    log.info("Post url isn't Pixiv", { postUrl: post.url });
    return { status: "no match", albums: [] };
  }

  const pixivId = parseInt(m[1]);
  const { status, album } = await mirror(pixivId);

  switch (status) {
    case "ok":
      return { status: "ok", albums: [album] };
    case "unrestricted":
      return { status: "only unrestricted", albums: [] };
    case "failed":
      return { status: "error", albums: [] };
  }
}

/**
 * Process a post.
 *
 * @param postId The id of the post to process.
 */
export default async function processPost(postId: string): Promise<void> {
  const log = logger.child({ post: postId });
  log.info("Processing post");

  // @ts-expect-error: Pending not-an-aardvark/snoowrap#221
  const post: Submission = await client.getSubmission(postId).fetch();

  if (post.archived) {
    log.info("Post is archived, ignoring");
    return;
  }

  if (await alreadyReplied(post)) {
    log.info("Already replied to post");
    return;
  }

  const { status, albums } = await mirrorPost(post);

  if (status !== "ok" || albums.length !== 1) {
    log.info("Unable to mirror post", { status });
    return;
  }
  const album = albums[0];

  const { remove, distinguish, sticky } = await getActions(post);
  const msg = remove
    ? buildRemovalComment(album, post.permalink)
    : buildComment([album], post.permalink);
  // @ts-expect-error: Pending not-an-aardvark/snoowrap#221
  const reply = await post.reply(msg);
  log.info("Successfuly replied to post", { replyId: reply.id });

  if (distinguish) {
    await reply.distinguish({ status: true, sticky });
    log.info("Distinguished comment", { sticky });
  }
  if (remove) {
    // @ts-expect-error: Pending not-an-aardvark/snoowrap#221
    await post.remove({ spam: false });
    log.info("Removed post");
  }
}
