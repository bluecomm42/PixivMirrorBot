import * as db from "./common/database.js";
import log from "./common/logger.js";

(async () => {
  await db.init();
  await db.stop();
  log.close();
})();
