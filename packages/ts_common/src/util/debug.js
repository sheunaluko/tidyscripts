import { get_logger } from "../logger";
export var db = {};
export function add(id, val) {
    db[id] = val;
}
export function get(id) {
    return db[id];
}
export var log = get_logger({ id: "debug" });
