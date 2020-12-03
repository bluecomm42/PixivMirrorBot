import got from "got";
import FormData from "form-data";

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
  const form = new FormData();
  form.append("title", title);
  form.append("description", description);
  form.append("privacy", "hidden");
  form.append("deletehashes", images.join(","));
  const res = await got
    .post("https://api.imgur.com/3/album", { body: form, headers })
    .json();
  // @ts-ignore: Pending sindresorhus/got#1548
  return res.data;
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
  const form = new FormData();
  form.append("image", data, { filename: "image.png" });
  if (!!description) {
    form.append("description", description);
  }
  const res = await got
    .post("https://api.imgur.com/3/upload", { body: form, headers })
    .json();
  // @ts-ignore: Pending sindresorhus/got#1548
  return res.data;
}

export default {
  createAlbum,
  uploadImage,
};
