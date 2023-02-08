var log = get_logger({ id: "log" });
var suppress_map = {};
/**
 * Suppresses the logs of the specified id
 */
export function suppress(id, reason) {
    suppress_map[id] = true;
    log("Suppressing ".concat(id, ", reason=").concat(reason || "none_given"));
}
/**
 * Unsuppress the logs of the specified id
 */
export function unsuppress(id) {
    suppress_map[id] = false;
    log("Unsuppressing ".concat(id));
}
/**
 * Creates a logger object based on input options.
 * This is used to help separate and manage logs from submodules.
 * ```typescript
 * const log = get_logger({id: "util"})
 * log("brackets contain the submodule name") // => [util]:: brackets contain the submodule name
 * ```
 */
export function get_logger(ops) {
    var id = ops.id;
    return function (t) {
        if (suppress_map[id]) {
            return;
        }
        ; //suppress if applicable 
        if (t.toString() == '[object Object]') {
            console.log("[".concat(id, "]:: > "));
            console.log(t);
        }
        else {
            console.log("[".concat(id, "]:: ").concat(t));
        }
    };
}
