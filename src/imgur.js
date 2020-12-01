import got from "got";
import FormData from "form-data";

/**
 * @typedef {Object} ImgurAlbum
 * @property {string} id
 * @property {string} deletehash
 */

/**
 * @typedef {Object} ImgurImage
 * @property {string} deletehash
 */

const headers = { Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}` };

/**
 * Create a new Imgur album.
 *
 * @param {string} title The title of the album.
 * @param {string} description The description of the album.
 * @param {string[]} images The array of deletehashes to add to this album.
 *
 * @returns {ImgurAlbum} The newly created album.
 */
export async function createAlbum(title, description, images) {
  const form = new FormData();
  form.append("title", title);
  form.append("description", description);
  form.append("privacy", "hidden");
  form.append("deletehashes", images.join(","));
  const res = await got
    .post("https://api.imgur.com/3/album", { body: form, headers })
    .json();
  return res.data;
}

/**
 * Upload an image to Imgur
 *
 * @param {Buffer} data The raw image data.
 * @param {string?} description The description of the image.
 *
 * @returns {ImgurImage} The newly created image.
 */
export async function uploadImage(data, description) {
  const form = new FormData();
  form.append("image", data, { filename: "image.png" });
  if (!!description) {
    form.append("description", description);
  }
  const res = await got
    .post("https://api.imgur.com/3/upload", { body: form, headers })
    .json();
  return res.data;
}

export default {
  createAlbum,
  uploadImage,
};
