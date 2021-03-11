import { sublog } from "../common/logger.js";
import PixivAppApi from "pixiv-app-api";
import got from "got";
import ent from "ent";
import { PixivIllust } from "pixiv-app-api/dist/PixivTypes";
import { getConfig, setConfig } from "../common/database.js";

const logger = sublog("pixiv");

let authed = false;
const headers = { referer: "https://pixiv.net/" };
const pixiv = new PixivAppApi(undefined, { camelcaseKeys: true });

/** A simplified Pixiv post. */
interface PixivPost {
  /** The title of the post. */
  title: string;
  /** The caption of the post. */
  caption: string;
  /** The image urls. */
  urls: string[];
  /** Whether or not the requires an account to view. */
  restricted: boolean;
}

/**
 * Extract a uniform array of image urls from a pixiv post.
 *
 * @param illust The pixiv post to extract urls from.
 *
 * @returns The array of extracted urls.
 */
function extractUrls(illust: PixivIllust): string[] {
  if (illust.metaPages.length > 0) {
    return illust.metaPages.map(p => p.imageUrls.original);
  } else {
    return [illust.metaSinglePage.originalImageUrl];
  }
}

/**
 * Format a Pixiv caption.
 *
 * @param caption The caption to format.
 *
 * @returns The formatted caption.
 */
function formatCaption(caption: string): string {
  if (!caption) {
    return "";
  }

  return ent.decode(caption.replace(/<br *\/?>/, "\n"));
}

async function auth(): Promise<void> {
  const token = process.env.PIXIV_TOKEN || (await getConfig("pixiv-token"));
  try {
    const res = await pixiv.login(token);
    await setConfig("pixiv-token", res.refreshToken);
  } catch (e) {
    logger.error("Unable to log in to pixiv", { refreshToken: token });
    logger.error(e);
    throw new PixivError("Unable to login to pixiv", e);
  }
  authed = true;
}

function isRestricted(i: PixivIllust): boolean {
  if (i.restrict) {
    return true;
  } else if (i.xRestrict) {
    return true;
  } else if (i.sanityLevel > 5) {
    return true;
  } else {
    logger.info(`Found unrestricted post ${i.id} (sanity ${i.sanityLevel})`);
    return false;
  }
}

/**
 * Extract relevant information from a Pixiv post.
 *
 * @param id The ID of the pixiv post.
 *
 * @returns The extracted pixiv post.
 */
export async function illust(id: number): Promise<PixivPost> {
  if (!authed) {
    await auth();
  }

  const { illust } = await pixiv.illustDetail(id);
  return {
    title: illust.title,
    caption: formatCaption(illust.caption),
    urls: extractUrls(illust),
    restricted: isRestricted(illust),
  };
}

/**
 * Download an image from Pixiv.
 *
 * @param url The URL of the image to download.
 *
 * @returns The downloaded image.
 */
export async function downloadImage(url: string): Promise<Buffer> {
  return await got.get(url, { headers }).buffer();
}

/**
 * An error within the pixiv subsystem.
 */
class PixivError extends Error {
  parent: Error;

  constructor(msg: string, parent: Error) {
    super(msg);
    this.parent = parent;

    // restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export default {
  illust,
  downloadImage,
};
