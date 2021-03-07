import { sublog } from "../common/logger.js";
import pixiv from "./pixiv.js";
import imgur from "./imgur.js";
import { getAlbum, cacheAlbum } from "../common/database.js";

const logger = sublog("mirror");

export type PixivStatuses = "ok" | "sfw" | "failed";
export interface PixivMirror {
  status: PixivStatuses;
  album?: string;
}

/**
 * Build a description for an Imgur mirror
 *
 * @param caption The caption of the Pixiv post.
 * @param attribution The attribution of the Pixiv post.
 *
 * @returns The constructed description.
 */
function buildDescription(caption: string, attribution: string): string {
  const cap = caption ? `${caption}\n\n-----\n` : "";
  return cap + attribution;
}

/**
 * Mirror a Pixiv post to Imgur.
 *
 * @param id The ID of the post to mirror.
 * @param retry Whether or not this is a retried attempt (internal use only).
 *
 * @returns The newly created Imgur mirror.
 */
async function _mirror(id: number, retry: boolean): Promise<PixivMirror> {
  const log = logger.child({ pixiv_id: id, retry });
  log.info("Mirroring post");

  // If the post was already mirrored, just use that one.
  const cached = await getAlbum(id);
  if (!!cached) {
    log.info("Cached mirror found");
    return { status: "ok", album: `https://imgur.com/a/${cached}` };
  }

  log.info("No cached mirror found");
  const { title, caption, urls, nsfw } = await pixiv.illust(id);

  // Only NSFW content is behind an account wall, so only mirror that.
  if (!nsfw) {
    log.info("Post is not blocked by an account wall");
    return { status: "sfw" };
  }

  const attribution = `Automatic mirror of https://pixiv.net/artworks/${id} by u/${process.env.REDDIT_USER}`;
  const description = buildDescription(caption, attribution);

  const hashes = [];
  for (let i = 0; i < urls.length; ++i) {
    log.info(`Mirroring image ${i + 1}/${urls.length}`);
    const img = await pixiv.downloadImage(urls[i]);
    // Only add the description to the first image in the album.
    const desc = i === 0 ? description : null;
    const { deletehash } = await imgur.uploadImage(img, desc);
    hashes.push(deletehash);
  }

  const album = await imgur.createAlbum(title, attribution, hashes);

  try {
    await cacheAlbum(id, album.id, album.deletehash);
    return { status: "ok", album: `https://imgur.com/a/${album.id}` };
  } catch (e) {
    // Something went wrong, clean up and abort.
    imgur.deleteAlbum(album.deletehash);

    if (e && e.constraint === "mirrors_pkey") {
      log.info(`Already mirrored the album ${id}. Whoops!`);
      // There's already a mirror in the db, try again, hopefully hitting the
      // cache this time.
      if (!retry) return _mirror(id, true);
    } else {
      log.error("Unable to cache album", e);
    }

    return { status: "failed" };
  }
}

/**
 * Mirror a Pixiv post to Imgur.
 *
 * @param id The ID of the post to mirror.
 *
 * @returns The newly created Imgur mirror.
 */
export default async function mirror(id: number): Promise<PixivMirror> {
  return await _mirror(id, false);
}
