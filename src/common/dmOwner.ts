import { Job } from "bullmq";
import client from "./client.js";
import { getTraceUUID } from "./logger.js";
import { mdCodeBlock } from "./util.js";

export default async function sendDM(msg: string): Promise<void> {
  let trace = getTraceUUID();
  await client.composeMessage({
    to: "bluecomm403",
    subject: "",
    text: msg + `\n\n---\n\nTrace: ${trace}`,
  });
}

export async function sendJobErrorDM(job: Job, err: Error): Promise<void> {
  const jobBlock = mdCodeBlock(JSON.stringify(job.asJSON(), null, 2));
  const errBlock = mdCodeBlock(err.stack ?? err.message);
  return sendDM(
    `Something went wrong while I was processing the job:\n${jobBlock}\n\n${errBlock}`
  );
}
