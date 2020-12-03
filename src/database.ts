import { sublog } from "./logger.js";
import { v4 as uuid } from "uuid";
import pg from "pg";

const logger = sublog("database");

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: { rejectUnauthorized: false },
});

/**
 * Initalize the database, if needed.
 */
export async function init(): Promise<void> {
  let log = logger.child({ action: "init table", uuid: uuid() });
  log.info("Initalizing table");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mirrors (
      id integer PRIMARY KEY,
      album_id varchar(32) NOT NULL,
      deletehash varchar(32) NOT NULL
    );
  `);
  log.info("Table init done");
}

/**
 * Get a cached album, if it exists.
 *
 * @param id The id of the Pixiv post.
 *
 * @returns The id of the mirrored album, or null if no mirror exists yet.
 */
export async function getAlbum(id: number): Promise<string | null> {
  let log = logger.child({ action: "fetch album", id, uuid: uuid() });
  log.info("Starting fetch");
  const query = "SELECT album_id FROM mirrors WHERE id = $1";
  const res = await pool.query(query, [id]);
  if (res.rows.length === 0) {
    log.info("Fetch failed");
    return null;
  } else {
    log.info("Fetch succeeded");
    return res.rows[0].album_id;
  }
}

/**
 * Add an album to the database.
 *
 * @param id The id of the mirrored Pixiv post.
 * @param albumId The id of the imgur album.
 * @param deletehash The deletehash of the imgur album.
 */
export async function cacheAlbum(
  id: number,
  albumId: string,
  deletehash: string
): Promise<void> {
  let log = logger.child({
    action: "store album",
    id,
    albumId,
    deletehash,
    uuid: uuid(),
  });
  log.info("Saving to database");
  const query =
    "INSERT INTO mirrors(id, album_id, deletehash) VALUES ($1, $2, $3)";
  await pool.query(query, [id, albumId, deletehash]);
  log.info("Saved");
}
