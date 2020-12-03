import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: { rejectUnauthorized: false },
});

/**
 * Initalize the database, if needed.
 */
export async function init(): Promise<void> {
  console.log("Initalizing table...");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mirrors (
      id integer PRIMARY KEY,
      album_id varchar(32) NOT NULL,
      deletehash varchar(32) NOT NULL
    );
  `);
  console.log("Table init done");
}

/**
 * Get a cached album, if it exists.
 *
 * @param id The id of the Pixiv post.
 *
 * @returns The id of the mirrored album, or null if no mirror exists yet.
 */
export async function getAlbum(id: number): Promise<string | null> {
  console.log(`Getting album ${id}...`);
  const query = "SELECT album_id FROM mirrors WHERE id = $1";
  const res = await pool.query(query, [id]);
  if (res.rows.length === 0) {
    console.log(`No cache for ${id}`);
    return null;
  } else {
    console.log(`Got cache for ${id}`);
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
  console.log(`Caching album ${id}...`);
  const query =
    "INSERT INTO mirrors(id, album_id, deletehash) VALUES ($1, $2, $3)";
  await pool.query(query, [id, albumId, deletehash]);
  console.log(`Album ${id} cached`);
}
