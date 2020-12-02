import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Only try to load from .env in dev mode.
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const basedir = path.resolve(__dirname, "..");

const pkg = fs.readFileSync(path.join(basedir, "./package.json"));
export const version = JSON.parse(pkg).version;
