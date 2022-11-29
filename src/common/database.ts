import "./config.js";
import { sublog } from "./logger.js";
import pg from "pg";

const logger = sublog("database");

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URI,
  // ssl: { rejectUnauthorized: false },
});

export interface Timestamps {
  [key: string]: number;
}

export interface CombinedTimestamps {
  [key: string]: {
    post: number;
    comment: number;
  };
}

/**
 * Initalize the database, if needed.
 */
export async function init(): Promise<void> {
  let log = logger.child({ action: "init table" });
  log.info("Initalizing tables");
  await pool.query(`
  CREATE TABLE IF NOT EXISTS misc (
    id text PRIMARY KEY,
    data text NOT NULL
  );
`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mirrors (
      id integer PRIMARY KEY,
      album_id varchar(32) NOT NULL,
      deletehash varchar(32) NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS subreddits (
      name varchar(26) PRIMARY KEY,
      last_post bigint NOT NULL,
      last_comment bigint NOT NULL
    );
  `);
  log.info("Table init done");
}

/**
 * Close the database connection(s).
 */
export async function stop(): Promise<void> {
  logger.info("Closing database connection(s)");
  await pool.end();
  logger.info("Database successfully disconnected");
}

/**
 * Get a cached album, if it exists.
 *
 * @param id The id of the Pixiv post.
 *
 * @returns The id of the mirrored album, or null if no mirror exists yet.
 */
export async function getAlbum(id: number): Promise<string | null> {
  let log = logger.child({ action: "fetch album", pixiv_id: id });
  log.debug("Starting fetch");
  const query = "SELECT album_id FROM mirrors WHERE id = $1";
  const res = await pool.query(query, [id]);
  if (res.rows.length === 0) {
    log.debug("Fetch failed");
    return null;
  } else {
    log.debug("Fetch succeeded");
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
  });
  log.debug("Saving to database");
  const query =
    "INSERT INTO mirrors(id, album_id, deletehash) VALUES ($1, $2, $3)";
  await pool.query(query, [id, albumId, deletehash]);
  log.debug("Saved");
}

function buildPlaceholderList(length: number, start = 1, seperator = ", ") {
  let range = [];
  for (let i = start; i < start + length; ++i) {
    range.push(i);
  }
  return "$" + range.join(seperator + "$");
}

function buildInsertQuery(
  table: string,
  columns: string[],
  rows: any[],
  startIndex = 1
) {
  let valuePlaceholders: string[] = [];
  for (let i = 0; i < rows.length; ++i) {
    let placeholder = buildPlaceholderList(
      columns.length,
      i * columns.length + startIndex
    );
    valuePlaceholders.push(`(${placeholder})`);
  }

  const cols = columns.join(", ");
  const valPH = valuePlaceholders.join(", ");
  return `INSERT INTO ${table}(${cols}) VALUES ${valPH}`;
}

function buildUpsertQuery(
  table: string,
  columns: string[],
  rows: any[],
  updateColumn = (old: string, nnew: string) => nnew,
  startIndex = 1
) {
  if (columns.length < 2) {
    throw new Error("Upsert query requires at least two columns.");
  }

  const insert = buildInsertQuery(table, columns, rows, startIndex);

  let updates: string[] = [];
  for (let i = 1; i < columns.length; ++i) {
    const col = columns[i];
    const newVal = updateColumn(`${table}.${col}`, `EXCLUDED.${col}`);
    updates.push(`${col} = ${newVal}`);
  }

  const update = updates.join(", ");
  return `${insert} ON CONFLICT (${columns[0]}) DO UPDATE SET ${update}`;
}

/**
 * Get the timestamps of the last processed posts for each of the subreddits.
 *
 * @param subreddits The subreddits to get the last processed posts of.
 *
 * @returns An object mapping each subreddit name to the timestamp of its last
 *          processed post, or 0 if no entry was found.
 */
export async function getLastTimestamps(
  subreddits: string[]
): Promise<CombinedTimestamps> {
  subreddits = subreddits.sort();
  let log = logger.child({ action: "fetch post timestamps", subreddits });
  log.debug("Starting fetch");
  const placeholders = buildPlaceholderList(subreddits.length);
  const query = `SELECT name, last_post, last_comment FROM subreddits WHERE name IN (${placeholders}) ORDER BY name ASC`;
  const res = await pool.query(query, subreddits);
  const o: CombinedTimestamps = {};
  for (let i = 0, j = 0; i < subreddits.length; ++i) {
    const sub = subreddits[i];
    if (j >= res.rows.length || sub < res.rows[j].name) {
      o[sub] = { post: 0, comment: 0 };
    } else {
      const row = res.rows[j];
      o[sub] = { post: row.last_post, comment: row.last_comment };
      ++j;
    }
  }

  log.debug("Fetch succeeded", { timestamps: o });
  return o;
}

export async function saveLastTimestamps(
  timestamps: CombinedTimestamps
): Promise<void> {
  let log = logger.child({ action: "store post timestamps" });
  log.debug("Saving to database", { timestamps });

  const ts = [];
  for (const sub in timestamps) {
    ts.push([sub, timestamps[sub].post, timestamps[sub].comment]);
  }
  if (ts.length === 0) {
    log.debug("No input data");
    return;
  }

  const query = buildUpsertQuery(
    "subreddits",
    ["name", "last_post", "last_comment"],
    ts,
    (o, n) => `GREATEST(${o}, ${n})`
  );
  await pool.query(query, ts.flat());
  log.debug("Saved");
}

export async function getConfig(key: string): Promise<string | null> {
  let log = logger.child({ action: "fetch config", key: key });
  log.debug("Starting fetch");
  const query = "SELECT data FROM misc WHERE id = $1";
  const res = await pool.query(query, [key]);
  if (res.rows.length === 0) {
    log.debug("Fetch failed");
    return null;
  } else {
    log.debug("Fetch succeeded");
    return res.rows[0].data;
  }
}

export async function setConfig(key: string, data: string): Promise<void> {
  let log = logger.child({ action: "store config", key, data });
  log.debug("Saving to database");
  const query =
    "INSERT INTO misc(id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2";
  await pool.query(query, [key, data]);
  log.debug("Saved");
}

export async function getLastRun(fallback = 0): Promise<number> {
  let data = await getConfig("last_run");
  let lastRun = parseInt(data);
  return isNaN(lastRun) ? fallback : lastRun;
}

export async function setLastRun(time: number): Promise<void> {
  await setConfig("last_run", "" + time);
}
