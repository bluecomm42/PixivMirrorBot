import { sublog } from "./logger.js";
import { v4 as uuid } from "uuid";
import got from "got";
import FormData from "form-data";

const logger = sublog("imgur");

/** A simplified Imgur album object. */
export interface ImgurAlbum {
  /** The id of the album. */
  id: string;
  /** The deletehash of the album. */
  deletehash: string;
}

/** A simplified Imgur image object. */
export interface ImgurImage {
  /** The deletehash of the image. */
  deletehash: string;
}

const headers = { Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}` };

/**
 * Create an album from a collection of images.
 *
 * @param title The title of the album.
 * @param description The description of the album.
 * @param images The list of images.
 *
 * @returns The newly created album.
 */
export async function createAlbum(
  title: string,
  description: string,
  images: string[]
): Promise<ImgurAlbum> {
  const log = logger.child({ action: "create album", uuid: uuid() });
  log.info({ title, description, images }, "Creating album");

  const form = new FormData();
  form.append("title", title);
  form.append("description", description);
  form.append("privacy", "hidden");
  form.append("deletehashes", images.join(","));

  const res = await got
    .post("https://api.imgur.com/3/album", { body: form, headers })
    .json();

  // @ts-ignore: Pending sindresorhus/got#1548
  const album: ImgurAlbum = res.data;
  log.info(album, "Successfully created album");
  return album;
}

/**
 * Delete a given imgur album.
 *
 * @param deletehash The deletehash of the album to delete.
 */
export async function deleteAlbum(deletehash: string): Promise<void> {
  const log = logger.child({
    action: "delete album",
    deletehash,
    uuid: uuid(),
  });
  log.info("Deleting album");
  await got.delete(`https://api.imgur.com/3/album/${deletehash}`, { headers });
  log.info("Successfully deleted album");
}

/**
 * Upload an image to Imgur
 *
 * @param data The raw image data.
 * @param description The description of the image.
 *
 * @returns The newly created image.
 */
export async function uploadImage(
  data: Buffer,
  description?: string
): Promise<ImgurImage> {
  const log = logger.child({ action: "upload image", uuid: uuid() });
  log.info({ description }, "Uploading new image");

  const form = new FormData();
  form.append("image", data, { filename: "image.png" });
  if (!!description) {
    form.append("description", description);
  }
  const res = await got
    .post("https://api.imgur.com/3/upload", { body: form, headers })
    .json();

  log.info("Successfully uploaded image");
  // @ts-ignore: Pending sindresorhus/got#1548
  return res.data;
}

export default {
  createAlbum,
  deleteAlbum,
  uploadImage,
};
