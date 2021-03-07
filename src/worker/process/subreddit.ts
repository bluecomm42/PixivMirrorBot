import { sublog } from "../../common/logger.js";
import { Listing, Submission, Subreddit, Comment } from "snoowrap";
import * as db from "../../common/database.js";
import { maxPageSize } from "../../common/config.js";
import client from "../../common/client.js";
import queue from "../../common/queue.js";
import { ListingOptions } from "snoowrap/dist/objects";
import { Timestamps } from "../../common/database.js";
import { extractTimestamps, mergeTimestamps } from "../../common/util.js";

const logger = sublog("processSubreddits");

export default async function processSubreddits(): Promise<void> {
  let subreddits: Listing<Subreddit>;
  logger.info("Processing subreddits...");
  const startTime = Math.floor(Date.now() / 1000);
  do {
    // Fetch (more) subreddits.
    if (subreddits == null) {
      // TODO: Get list of subreddits from a local database so that we can
      // process subs we are not mod on as well.
      subreddits = await client.getModeratedSubreddits({ limit: maxPageSize });
    } else {
      subreddits = await subreddits.fetchMore({
        amount: maxPageSize,
        append: false,
      });
    }

    // Process the subreddits
    const names = subreddits.map(s => s.display_name);
    logger.info("Got subreddits", { names });

    // TODO: clsWrap?
    const timestamps = await db.getLastTimestamps(names);
    const newPosts = await processSubredditPosts(names, timestamps);
    const newComments = await processSubredditComments(names, timestamps);
    const newTimestamps = mergeTimestamps(newPosts, newComments);
    await db.saveLastTimestamps(newTimestamps);
  } while (!subreddits.isFinished);
  await db.setLastRun(startTime);
}

export async function processSubredditContent<T extends Submission | Comment>(
  subs: string[],
  contentType: "comment" | "post",
  getItems: (sub: string, opts: ListingOptions) => Promise<Listing<T>>,
  lastTimestamps: Timestamps
): Promise<Timestamps> {
  const log = logger.child({
    action: "process subreddit content",
    contentType,
  });
  log.info("Processing subreddits' content", { subs });
  const now = Math.floor(Date.now() / 1000);
  const threeHoursAgo = now - 3 * 60 * 60;

  const lastRun = await db.getLastRun(threeHoursAgo);
  for (const sub in lastTimestamps) {
    if (lastTimestamps[sub] === 0) {
      // If the subreddit is new (hasn't been processed yet), then don't
      // retroactively process items.
      lastTimestamps[sub] = now;
    } else {
      // Ignore all items older than three hours, just in case.
      lastTimestamps[sub] = Math.max(lastTimestamps[sub], threeHoursAgo);
    }
  }

  let items: Listing<T>;
  const newestItems = Object.assign({}, lastTimestamps);
  let shouldContinue = true;
  do {
    if (items == null) {
      items = await getItems(subs.join("+"), { limit: maxPageSize });
    } else {
      items = await items.fetchMore({ amount: maxPageSize, append: false });
    }

    shouldContinue = false;
    for (const item of items) {
      const itmLog = log.child({ id: item.name });
      itmLog.info("Processing item");

      const sub = item.subreddit.display_name;
      const timestamp = item.created_utc;
      // If the post is older than the start of the previous run then we have
      // definitely gone through all possible new posts and should stop there.
      if (timestamp < lastRun) {
        itmLog.info("Reached end of new items");
        shouldContinue = false;
        break;
      }

      // Ignore any old (already processed) posts.
      let cutoff = lastTimestamps[sub];
      if (timestamp < cutoff) {
        itmLog.info("Item too old", { timestamp, cutoff });
        continue;
      }

      // TODO: Figure out if item is locked?
      if (/*item.locked || */ item.archived) {
        itmLog.info("Item locked");
        continue;
      }

      // Keep track of the newest post we've seen from each sub.
      newestItems[sub] = Math.max(newestItems[sub] || 0, timestamp);
      queue.add(`process-${contentType}`, { id: item.id });
      itmLog.info(`Queued ${contentType} for processing`);
    }
  } while (!items.isFinished && shouldContinue);

  return newestItems;
}

export async function processSubredditPosts(
  subs: string[],
  timestamps: db.CombinedTimestamps
): Promise<Timestamps> {
  return await processSubredditContent(
    subs,
    "post",
    (sub, opts) => client.getNew(sub, opts),
    extractTimestamps(timestamps, "post")
  );
}

export async function processSubredditComments(
  subs: string[],
  timestamps: db.CombinedTimestamps
): Promise<Timestamps> {
  return await processSubredditContent(
    subs,
    "comment",
    (sub, opts) => client.getNewComments(sub, opts),
    extractTimestamps(timestamps, "comment")
  );
}
