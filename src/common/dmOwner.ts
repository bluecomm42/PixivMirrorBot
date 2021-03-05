import { Job } from "bullmq";
import client from "./client.js";
import { buildDmSubject, mdCodeBlock } from "./util.js";

export default async function sendDM(msg: string): Promise<void> {
  await client.composeMessage({
    to: "bluecomm403",
    subject: buildDmSubject(),
    text: msg,
  });
}

export async function sendJobErrorDM(job: Job, err: Error): Promise<void> {
  const jobBlock = mdCodeBlock(JSON.stringify(job.asJSON(), null, 2));
  const errBlock = mdCodeBlock(`${err.message}\n${err.stack ?? ""}`);
  return sendDM(
    `Something went wrong while I was processing the job:\n${jobBlock}\n\n${errBlock}`
  );
}
