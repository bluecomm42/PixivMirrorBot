import pixiv from "./pixiv.js";
import imgur from "./imgur.js";

/**
 * Build a description for an Imgur mirror
 *
 * @param {string} caption The caption of the Pixiv post.
 * @param {string} attribution The attribution of the Pixiv post.
 *
 * @returns {string} The constructed description.
 */
function buildDescription(caption, attribution) {
  const cap = caption ? `${caption}\n\n-----\n` : "";
  return cap + attribution;
}

/**
 * Mirror a Pixiv post to Imgur.
 *
 * @param {number} id The ID of the post to mirror.
 *
 * @returns {string} The url of the newly created Imgur mirror.
 */
export default async function mirror(id) {
  console.log(`[${id}] Fetching post...`);
  const { title, caption, urls, nsfw } = await pixiv.illust(id);

  // Only NSFW content is behind an account wall, so only mirror that.
  if (!nsfw) {
    console.log(`[${id}] Post is not blocked by an account wall, skipping`);
    return null;
  }

  const attribution = `Mirror of https://pixiv.net/artworks/${id}`;
  const description = buildDescription(caption, attribution);

  const hashes = [];
  for (let i = 0; i < urls.length; ++i) {
    console.log(`[${id}] Mirroring image ${i + 1}/${urls.length}...`);
    const img = await pixiv.downloadImage(urls[i]);
    // Only add the description to the first image in the album.
    const desc = i === 0 ? description : null;
    const { deletehash } = await imgur.uploadImage(img, desc);
    hashes.push(deletehash);
  }

  console.log(`[${id}] Creating album...`);
  const album = await imgur.createAlbum(title, attribution, hashes);

  return `https://imgur.com/a/${album.id}`;
}
