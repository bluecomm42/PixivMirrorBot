import logfmt from "logfmt";
import { v4 as uuid } from "uuid";
import { EventEmitter } from "events";
import * as cls from "cls-hooked";

const clsNamespace = cls.createNamespace("clsLoggerNamespace");

/**
 * A logger object.
 */
export class Logger {
  /** A context to apply to all log messages. */
  context: object;

  /**
   * Create a new logger.
   *
   * @param context An optional context to apply to all messages.
   */
  constructor(context: object = {}) {
    this.context = context;
  }

  /**
   * Create a new logger that inherits it's parent's context.
   *
   * @param context An optional context to extend the parent.
   *
   * @returns The new child logger.
   */
  child(context: object = {}): Logger {
    // Allow child context to override parent context.
    return new Logger({ ...context, ...this.context });
  }

  /**
   * Log a generic message.
   *
   * @param lvl The level to log at.
   * @param msg The message to log.
   * @param context The optional context for this message.
   */
  log(lvl: string, msg: string | Error, context: object | Error = {}): void {
    if (context instanceof Error) {
      context = {
        error: context,
        stack: context.stack,
      };
    }

    if (msg instanceof Error) {
      context = {
        error: msg,
        stack: msg.stack,
        ...context,
      };
      msg = msg.message;
    }

    // Allow msg context to override parent context.
    context = { ...context, ...this.context };

    // Add trace UUID, if present.
    const trace_uuid = clsNamespace.get("trace_uuid");
    if (trace_uuid != null) {
      context = { ...context, trace_uuid };
    }

    const data = logfmt.stringify(context);
    console.log(`[${lvl}] ${msg} ${data}`);
  }

  /**
   * Log a fatal message.
   *
   * @param msg The message to log.
   * @param context The optional context for this message.
   */
  fatal(msg: string | Error, context: object = {}): void {
    this.log("fatal", msg, context);
  }

  /**
   * Log an error message.
   *
   * @param msg The message to log.
   * @param context The optional context for this message.
   */
  error(msg: string | Error, context: object = {}): void {
    this.log("error", msg, context);
  }

  /**
   * Log a warning message.
   *
   * @param msg The message to log.
   * @param context The optional context for this message.
   */
  warn(msg: string | Error, context: object = {}): void {
    this.log("warn", msg, context);
  }

  /**
   * Log an info message.
   *
   * @param msg The message to log.
   * @param context The optional context for this message.
   */
  info(msg: string | Error, context: object = {}): void {
    this.log("info", msg, context);
  }

  /**
   * Log a debug message.
   *
   * @param msg The message to log.
   * @param context The optional context for this message.
   */
  debug(msg: string | Error, context: object = {}): void {
    this.log("debug", msg, context);
  }

  /**
   * Log a trace message.
   *
   * @param msg The message to log.
   * @param context The optional context for this message.
   */
  trace(msg: string | Error, context: object = {}): void {
    this.log("trace", msg, context);
  }
}

const log = new Logger();
export default log;

export function clsBind(...emitters: EventEmitter[]): void {
  for (const emitter of emitters) {
    clsNamespace.bindEmitter(emitter);
  }
}
export async function clsWrap<T>(fn: () => Promise<T>): Promise<T> {
  return clsNamespace.runPromise(() => {
    clsNamespace.set("trace_uuid", uuid());
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
