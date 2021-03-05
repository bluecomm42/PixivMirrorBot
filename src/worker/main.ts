import { inProduction, queueName, version } from "../common/config.js";
import logger, { clsWrap } from "../common/logger.js";
import processSubreddits from "./process/subreddit.js";
import processInbox from "./process/inbox.js";
import processComment from "./process/comment.js";
import processPost from "./process/post.js";
import queue, { connection } from "../common/queue.js";
import { sendJobErrorDM } from "../common/dmOwner.js";
import { Job, QueueScheduler, Worker } from "bullmq";
import Bluebird from "bluebird";
import processMention from "./process/mention.js";

logger.info(`Starting PixivMirrorBot worker v${version}`);

const scheduler = new QueueScheduler(queueName, { connection });
// Process subreddits every 5 minutes.
const minute = 60 * 1000;
const fiveMins = 5 * minute;

const processInterval = inProduction ? fiveMins : minute;
queue.add("process-subreddits", null, { repeat: { every: processInterval } });
queue.add("process-inbox", null, { repeat: { every: processInterval } });

/**
 * Process a job from the queue.
 *
 * @param job The job to process.
 */
async function _processJob(job: Job) {
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
    case "process-mention":
      await processMention(job.data.id);
      break;
    // TODO?:
    // case "mirrorPost":
    //   await mirrorPost(job.data);
    //   break;
    default:
      logger.warn("Unknown job type", { jobType: job.name });
  }
}

async function processJob(job: Job) {
  const log = logger.child({ job: { name: job.name, id: job.id } });
  try {
    log.info("Processing job");
    await _processJob(job);
    log.info("Finished processing job");
  } catch (e) {
    log.error("Failed to process job", e);
    await sendJobErrorDM(job, e);
    throw e;
  }
}

async function wrapJob(job: Job) {
  await clsWrap(() => processJob(job), { jobId: job.id });
}

// Start the worker.
const worker = new Worker(queueName, wrapJob, { concurrency: 2, connection });

/**
 * Perform a clean shutdown of the system.
 *
 * @param signal The signal that caused the shutdown.
 */
function shutdown(signal: NodeJS.Signals) {
  logger.info(`Received ${signal}, shutting down...`);
  Bluebird.all([worker.close(), scheduler.close()])
    .then(() => logger.close())
    .then(() => process.exit(0));
}

// Perform a clean shutdown on SIGINT/SIGTERM
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
