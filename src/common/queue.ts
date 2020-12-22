import { queueName } from "./config.js";
import { Queue } from "bullmq";
import IORedis from "ioredis";

export const connection = new IORedis(process.env.REDIS_URL);
export const config = { connection };

// TODO: Remove old jobs from redis (taskforcesh/bullmq#347)
const queue = new Queue(queueName, config);
export default queue;
