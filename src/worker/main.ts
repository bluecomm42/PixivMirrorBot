import { queueName, version } from "../common/config.js";
import log, { clsWrap } from "../common/logger.js";
import processSubreddits from "./process/subreddit.js";
import processInbox from "./process/inbox.js";
import processComment from "./process/comment.js";
import processPost from "./process/post.js";
import queue, { connection } from "../common/queue.js";
import { Job, QueueScheduler, Worker } from "bullmq";
import Bluebird from "bluebird";

log.info(`Starting PixivMirrorBot worker v${version}`);

const scheduler = new QueueScheduler(queueName, { connection });
// Process subreddits every 5 minutes.
const fiveMins = 5 * 60 * 1000;
queue.add("process-subreddits", null, { repeat: { every: fiveMins } });
queue.add("process-inbox", null, { repeat: { every: fiveMins } });

/**
 * Process a job from the queue.
 *
 * @param job The job to process.
 */
async function _processJob(job: Job) {
  log.info("Processing job", { job: { name: job.name, id: job.id } });
  switch (job.name) {
    case "process-subreddits":
      await processSubreddits();
      break;
    case "process-inbox":
      await processInbox();
      break;
    case "process-post":
      await processPost(job.data.id);
      break;
    case "process-comment":
      await processComment(job.data.id);
      break;
    // TODO?:
    // case "mirrorPost":
    //   await mirrorPost(job.data);
    //   break;
    // TODO:
    // case "processMention":
    //   await processPost(job.data.id);
    //   break;
    default:
      log.warn("Unknown job type", { jobType: job.name });
  }
}

async function processJob(job: Job) {
  try {
    await _processJob(job);
  } catch (e) {
    log.error("Failed to process job", e);
    console.log(e);
    throw e;
  }
}

async function wrapJob(job: Job) {
  await clsWrap(() => processJob(job), { jobId: job.id });
}

// Start the worker.
const worker = new Worker(queueName, wrapJob, { connection });

/**
 * Perform a clean shutdown of the system.
 *
 * @param signal The signal that caused the shutdown.
 */
function shutdown(signal: NodeJS.Signals) {
  log.info(`Received ${signal}, shutting down...`);
  Bluebird.all([worker.close(), scheduler.close()])
    .then(() => log.close())
    .then(() => process.exit(0));
}

// Perform a clean shutdown on SIGINT/SIGTERM
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
