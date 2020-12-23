import { inProduction } from "./config.js";
import winston, { Logger } from "winston";
import * as cls from "cls-hooked";
import { v4 as uuid } from "uuid";
import { EventEmitter } from "events";
import { SyslogTransportInstance } from "winston-syslog";
import { Transports as WinstonTransports } from "winston/lib/winston/transports";
import TransportStream from "winston-transport";

import "winston-syslog";

type Transports = WinstonTransports & { Syslog: SyslogTransportInstance };
const transports = winston.transports as Transports;

const clsNamespace = cls.createNamespace("clsLoggerNamespace");

function getTransports(): TransportStream[] {
  const format = winston.format.combine(
    winston.format.errors({ stack: true }),
    addTrace(),
    winston.format.simple()
  );
  const tps: TransportStream[] = [new transports.Console({ format })];

  const host = process.env.SYSLOG_HOST;
  const port = parseInt(process.env.SYSLOG_PORT);
  if (inProduction && !!host && !!port) {
    tps.push(
      new transports.Syslog({
        host,
        port,
        protocol: "tls4",
        localhost: `u/${process.env.REDDIT_USER}`,
        eol: "\n",
        format,
      })
    );
  }

  return tps;
}

const addTrace = winston.format((info, opts) => {
  // Add trace UUID, if present.
  const _trace = clsNamespace.get("_trace");
  if (_trace != null) {
    info = { ...info, _trace };
  }

  // Add trace data, if present.
  const _traceData = clsNamespace.get("_traceData");
  if (_traceData != null) {
    info = { ...info, _traceData };
  }
  return info;
});

/** The default logger. */
const log = winston.createLogger({
  level: "info",
  transports: getTransports(),
});
export default log;

/**
 * Bind one or more emitters to the CLS logging namespace.
 *
 * @param emitters The emitters to bind.
 */
export function clsBind(...emitters: EventEmitter[]): void {
  for (const emitter of emitters) {
    clsNamespace.bindEmitter(emitter);
  }
}

/**
 * Run an async function call in the CLS logging namespace.
 *
 * @param fn The function to run.
 */
export async function clsWrap<T>(fn: () => Promise<T>, data?: any): Promise<T> {
  return clsNamespace.runPromise(() => {
    clsNamespace.set("_trace", uuid());
    if (data) {
      clsNamespace.set("_traceData", data);
    }
    return fn();
  });
}

/**
 * Make a new logger for a given subsystem.
 *
 * @param subsystem The name of the subsystem.
 */
export function sublog(subsystem: string): Logger {
  return log.child({ subsystem });
}
