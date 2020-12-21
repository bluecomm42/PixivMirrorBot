import { sublog } from "../../common/logger.js";
import client from "../../common/client.js";

const logger = sublog("processor.inbox");

export default async function processInbox(): Promise<void> {
  logger.info("Checking inbox");
  const messages = await client.getUnreadMessages();
  if (messages.length === 0) {
    logger.info("No messages");
    return;
  }

  client.markMessagesAsRead(messages);

  for (let msg of messages) {
    // Only process private messages.
    if (msg.was_comment) continue;

    const log = logger.child({ id: msg.id });
    log.info("Processing message");

    if (msg.subject.toLowerCase().includes("invitation to moderate")) {
      const sub = /*await*/ msg.subreddit; /*.fetch()*/
      log.info("Got invitation to moderate sub", { sub: sub.display_name });
      msg.reply(
        "Thanks for the invite! Unfortunately I am still under development and thus I'm not ready for use on other subreddits. For more info please contact my creator, u/bluecomm403."
      );
      continue;
    }

    if (msg.subject.toLowerCase().includes("has been removed as a moderator")) {
      const sub = /*await*/ msg.subreddit; /*.fetch()*/
      log.info("Removed as moderator from sub", { sub: sub.display_name });
      continue;
    }

    if (msg.subject === "username mention") {
      // TODO: Process these.
      log.info("Mentioned!");
      continue;
    }

    if (msg.distinguished === "moderator") {
      // Ignore distinguished messages so we don't spam modmail.
      log.info("Skipping distinguished message", {
        subject: msg.subject,
        body: msg.body,
      });
      continue;
    }

    msg.reply(
      "I'm a bot so I cannot reply to your message. If you need to report a bug please message my creator, u/bluecomm403."
    );
    log.info("Replied to message with standard reply", {
      subject: msg.subject,
      body: msg.body,
    });
  }
}
