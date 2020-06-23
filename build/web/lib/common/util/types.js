export var Status;
(function (Status) {
    Status["Ok"] = "OK";
    Status["Err"] = "ERR";
})(Status || (Status = {}));
export function Error(e) {
    return {
        status: Status.Err,
        error: e
    };
}
export function Success(arg) {
    return {
        status: Status.Ok,
        value: arg
    };
}
//# sourceMappingURL=types.js.map