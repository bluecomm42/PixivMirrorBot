import PixivAppApi from "pixiv-app-api";
import got from "got";
import ent from "ent";
import { PixivIllust } from "pixiv-app-api/dist/PixivTypes";

let authed = false;
const headers = { referer: "https://pixiv.net/" };
const pixiv = new PixivAppApi(
  process.env.PIXIV_EMAIL,
  process.env.PIXIV_PASSWORD,
  { camelcaseKeys: true }
);

/** A simplified Pixiv post. */
interface PixivPost {
  /** The title of the post. */
  title: string;
  /** The caption of the post. */
  caption: string;
  /** The image urls. */
  urls: string[];
  /** Whether or not the post is 18+ */
  nsfw: boolean;
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
    return illust.metaPages.map((p) => p.imageUrls.original);
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

/**
 * Extract relevant information from a Pixiv post.
 *
 * @param id The ID of the pixiv post.
 *
 * @returns The extracted pixiv post.
 */
export async function illust(id: number): Promise<PixivPost> {
  if (!authed) {
    await pixiv.login();
    authed = true;
  }

  const { illust } = await pixiv.illustDetail(id);
  return {
    title: illust.title,
    caption: formatCaption(illust.caption),
    urls: extractUrls(illust),
    // @ts-ignore: Pending akameco/pixiv-app-api#43
    nsfw: !!illust.xRestrict,
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

export default {
  illust,
  downloadImage,
};
