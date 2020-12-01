import "./config.js";
import mirror from "./pixiv-mirror.js";

(async () => {
  try {
    console.log("Mirroring post...");
    const album = await mirror(ID);
    console.log(`Done! View the album at ${album}`);
  } catch (e) {
    console.log("Something went wrong!");
    console.log(e);
    if (e.response && e.response.body) {
      console.log(e.response.body);
    }
    process.exit(1);
  }
})();
