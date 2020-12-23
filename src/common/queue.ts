import { inProduction, queueName } from "./config.js";
import { Queue } from "bullmq";
import IORedis from "ioredis";

export const connection = new IORedis(process.env.REDIS_URL);

const queue = new Queue(queueName, {
  connection,
  defaultJobOptions: {
    removeOnComplete: 1000,
    removeOnFail: 1000,
    attempts: inProduction ? 10 : 1,
    backoff: {
      type: "exponential",
      delay: 60 * 1000,
    },
  },
});
export default queue;
