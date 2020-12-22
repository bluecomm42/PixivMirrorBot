import * as db from "./common/database.js";

(async () => {
  await db.init();
  await db.stop();
  process.exit(0);
})();
