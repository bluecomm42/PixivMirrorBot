// This import must be first to ensure that environment variables are set up.
import { version } from "../common/config.js";

import log from "../common/logger.js";
import * as web from "./web.js";

(async () => {
  log.info(`Starting PixivMirrorBot web v${version}`);
  await web.start();

  /**
   * Perform a clean shutdown of the system.
   *
   * @param signal The signal that caused the shutdown.
   */
  async function shutdown(signal: NodeJS.Signals) {
    log.info(`Received ${signal}, shutting down...`);
    await web.stop();
    process.exit(0);
  }

  // Perform a clean shutdown on SIGINT/SIGTERM
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
})();
