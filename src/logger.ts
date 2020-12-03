import bunyan from "bunyan";

const log = bunyan.createLogger({ name: "PixivMirrorBot" });
export default log;

/**
 * Make a new logger for a given subsystem.
 *
 * @param subsystem The name of the subsystem.
 */
export function sublog(subsystem: string): bunyan {
  return log.child({ subsystem }, true);
}
