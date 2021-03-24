import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Only try to load from .env in dev mode.
export const inProduction = process.env.NODE_ENV === "production";
export const inDebug = !inProduction;

if (inDebug) {
  dotenv.config();
}

export const disabledMsg = process.env.DISABLED_MSG;
export const disabled = !!disabledMsg;

export const maxPageSize = 200;
export const pollInterval = 10 * 60 * 1000; // Check every 10 minutes.
export const queueName = "to-process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const basedir = path.resolve(__dirname, "../..");

const pkgPth = path.join(basedir, "./package.json");
const pkg = fs.readFileSync(pkgPth, { encoding: "utf-8" });
export const version = JSON.parse(pkg).version;
