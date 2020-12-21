import { queueName } from "./config.js";
import { Queue } from "bullmq";
import IORedis from "ioredis";

// TODO: Remove old jobs from redis (taskforcesh/bullmq#347)
export const config = { connection: new IORedis(process.env.REDIS_URL) };
const queue = new Queue(queueName, config);

export default queue;
