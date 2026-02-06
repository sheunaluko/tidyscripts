

export interface LoggerOps {
  id : string
}

// -- Storage --

interface StoredLog {
  id: string;
  timestamp: number;
  time_str: string;
  msg: string;
}

const all_logs: StoredLog[] = [];

function make_time_str(): string {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

function stringify_arg(arg: any): string {
  if (arg == null || arg == undefined) return String(arg);
  if (typeof arg === 'object') {
    try { return JSON.stringify(arg); }
    catch(_) { return '[unstringifiable object]'; }
  }
  return String(arg);
}

function format_stored_line(entry: StoredLog): string {
  return `[${entry.time_str}] ${entry.msg}`;
}

// -- Logger type --

export interface Logger {
  (...args: any[]): void;
  export_logs: () => string;
  clear_logs: () => void;
  id: string;
}

// -- Suppress --

var suppress_map : {[k:string] : boolean } = { } ;

/**
 * Suppresses the logs of the specified id (console only — storage continues)
 */
export function suppress(id : string, reason : string) {
  suppress_map[id] = true ;
  const log = get_logger({id:"log"}) ;
  log(`Suppressing ${id}, reason=${reason || "none_given"}`) ;
}

/**
 * Unsuppress the logs of the specified id
 */
export function unsuppress(id : string) {
  suppress_map[id] = false ;
  const log = get_logger({id:"log"}) ;
  log(`Unsuppressing ${id}`) ;
}


/**
 * Creates a logger object based on input options.
 * This is used to help separate and manage logs from submodules.
 * Returns a callable function with attached methods.
 * ```typescript
 * const log = get_logger({id: "util"})
 * log("brackets contain the submodule name") // => [util]:: brackets contain the submodule name
 * log("multi", "args", {key: "val"})         // => [util]:: multi args {"key":"val"}
 * log.export_logs()                           // => all stored logs for this id
 * ```
 */
export function get_logger(ops : LoggerOps): Logger {
  let { id } = ops ;

  const fn = function(...args: any[]) {

    // Build stored message string
    const parts = args.map(stringify_arg);
    const msg = `[${id}]:: ${parts.join(' ')}`;

    // Always store (even when suppressed)
    all_logs.push({
      id,
      timestamp: Date.now(),
      time_str: make_time_str(),
      msg,
    });

    // Console output (gated by suppress)
    if (suppress_map[id]) { return };

    // Pass raw args to console for native object inspection
    console.log(`[${id}]::`, ...args);

  } as Logger;

  fn.id = id;

  fn.export_logs = function(): string {
    const entries = all_logs.filter(e => e.id === id);
    if (entries.length === 0) return `No logs for id: ${id}`;
    return entries.map(format_stored_line).join('\n');
  };

  fn.clear_logs = function(): void {
    for (let i = all_logs.length - 1; i >= 0; i--) {
      if (all_logs[i].id === id) { all_logs.splice(i, 1); }
    }
  };

  return fn;
}

/**
 * Export logs across all ids, sorted by time.
 * Optionally filter by include/exclude id arrays.
 */
export function export_logs(opts?: { include?: string[], exclude?: string[] }): string {
  let entries = all_logs;

  if (opts?.include) {
    const inc = new Set(opts.include);
    entries = entries.filter(e => inc.has(e.id));
  }

  if (opts?.exclude) {
    const exc = new Set(opts.exclude);
    entries = entries.filter(e => !exc.has(e.id));
  }

  if (entries.length === 0) return 'No logs found';
  return entries.map(format_stored_line).join('\n');
}

/**
 * Clear all stored logs
 */
export function clear_all_logs(): void {
  all_logs.length = 0;
}

export function color_string(color : string, text : string) {
    let code = colors[color] ;
    let reset = colors['reset'] ;
    return `${code}${text}${reset}` ;
}

export var colors : any = {
    // ANSI escape codes for common colors
    red : '\x1b[31m' ,
    green :'\x1b[32m' ,
    reset : '\x1b[0m' ,  // Resets formatting to default
}
