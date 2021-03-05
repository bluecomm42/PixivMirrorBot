import { sublog } from "../../common/logger.js";
import client from "../../common/client.js";
import queue from "../../common/queue.js";
import { Listing, PrivateMessage } from "snoowrap";
import { maxPageSize } from "../../common/config.js";

const logger = sublog("processor.inbox");

async function processPrivateMessage(msg: PrivateMessage): Promise<void> {
  const log = logger.child({ id: msg.id });
  log.info("Processing private message");

  const subj = msg.subject.toLowerCase();
  if (subj.includes("invitation to moderate")) {
    log.info("Got invitation to moderate sub", {
      sub: msg.subreddit.display_name,
    });
    msg.reply(
      "Thanks for the invite! Unfortunately I am still under development and thus I'm not ready for use on other subreddits. For more info please contact my creator, u/bluecomm403."
    );
  } else if (subj.includes("has been removed as a moderator")) {
    const sub = /*await*/ msg.subreddit; /*.fetch()*/
    log.info("Removed as moderator from sub", { sub: sub.display_name });
  } else if (msg.distinguished === "moderator") {
    // Ignore distinguished messages so we don't spam modmail.
    log.info("Skipping distinguished message", {
      subject: msg.subject,
      body: msg.body,
    });
  } else if (msg.parent_id != null) {
    log.warn("Received (and ignoring) reply to private message", {
      subject: msg.subject,
      body: msg.body,
    });
  } else {
    msg.reply(
      "I'm a bot so I cannot reply to your message. If you need to report a bug please message my creator, u/bluecomm403."
    );
    log.info("Replied to message with standard reply", {
      subject: msg.subject,
      body: msg.body,
    });
  }
}

async function processComment(msg: PrivateMessage): Promise<void> {
  const log = logger.child({ id: msg.id });
  log.info("Processing comment");

  if (msg.subject === "username mention") {
    queue.add("process-mention", { id: msg.id });
    log.info("Queued mention for processing");
  } else {
    log.info("Ignored comment", {
      subject: msg.subject,
      body: msg.body,
    });
  }
}

export default async function processInbox(): Promise<void> {
  logger.info("Checking inbox");
  let messages: Listing<PrivateMessage>;
  do {
    if (messages == null) {
      messages = await client.getUnreadMessages({ limit: maxPageSize });
    } else {
      messages = await messages.fetchMore({
        amount: maxPageSize,
        append: false,
      });
    }

    if (messages.length > 0) {
      client.markMessagesAsRead(messages);
    }

    for (const msg of messages) {
      if (msg.was_comment) {
        await processComment(msg);
      } else {
        await processPrivateMessage(msg);
      }
    }
  } while (!messages.isFinished);
  logger.info("Finished processing inbox");
}
