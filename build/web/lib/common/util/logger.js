export function Logger(name) {
    return function (v) {
        if (typeof v === "object") {
            console.log("[" + name + "]::");
            console.log(v);
        }
        else {
            console.log("[" + name + "]:: " + v);
        }
    };
}
//# sourceMappingURL=logger.js.map