import PixivAppApi from "pixiv-app-api";
import got from "got";
import ent from "ent";

let authed = false;
const headers = { referer: "https://pixiv.net/" };
const pixiv = new PixivAppApi(
  process.env.PIXIV_EMAIL,
  process.env.PIXIV_PASSWORD,
  { camelcaseKeys: true }
);

/**
 * @typedef {Object} PixivPost
 * @property {string} title The title of the post.
 * @property {string} caption The formatted caption of the post.
 * @property {string[]} urls The extracted image URLs.
 * @property {boolean} nsfw Whether or not the post is 18+.
 */

/**
 * Extract a uniform array of image urls from a pixiv post.
 *
 * @param {PixivIllust} illust The pixiv post to extract urls from.
 *
 * @returns {string[]} The array of extracted urls.
 */
function extractUrls(illust) {
  if (illust.metaPages.length > 0) {
    return illust.metaPages.map((p) => p.imageUrls.original);
  } else {
    return [illust.metaSinglePage.originalImageUrl];
  }
}

/**
 * Format a Pixiv caption.
 *
 * @param {string} caption The caption to format.
 *
 * @returns {string} The formatted caption.
 */
function formatCaption(caption) {
  if (!caption) {
    return "";
  }

  return ent.decode(caption.replace(/<br *\/?>/, "\n"));
}

/**
 * Extract relevant information from a Pixiv post.
 *
 * @param {number} id The ID of the pixiv post.
 *
 * @returns {PixivPost} The extracted pixiv post.
 */
export async function illust(id) {
  if (!authed) {
    await pixiv.login();
    authed = true;
  }

  const { illust } = await pixiv.illustDetail(id);
  return {
    title: illust.title,
    caption: formatCaption(illust.caption),
    urls: extractUrls(illust),
    nsfw: !!illust.xRestrict,
  };
}

/**
 * Download an image from Pixiv.
 *
 * @param {string} url The URL of the image to download.
 *
 * @returns {Buffer} The downloaded image.
 */
export async function downloadImage(url) {
  return await got.get(url, { headers }).buffer();
}

export default {
  illust,
  downloadImage,
};
