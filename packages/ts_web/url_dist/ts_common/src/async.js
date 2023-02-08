(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.wait = exports.wait_until = exports.status = void 0;
    var ms = function () { return performance.now(); };
    var status;
    (function (status) {
        status[status["TIMEOUT"] = 0] = "TIMEOUT";
    })(status = exports.status || (exports.status = {}));
    function wait_until(f, timeout, rate) {
        var t_start = ms();
        rate = rate || 200;
        var p = new Promise(function (resolve, reject) {
            var id = setInterval(function () {
                var t_now = ms();
                if (f()) {
                    resolve(false);
                    clearInterval(id);
                }
                else {
                    var elapsed = t_now - t_start;
                    if (timeout && elapsed >= timeout) {
                        resolve(true);
                        clearInterval(id);
                    }
                }
            }, rate);
        });
        return p;
    }
    exports.wait_until = wait_until;
    function wait(t) {
        return new Promise(function (res, rej) {
            setTimeout(function () {
                res(status.TIMEOUT);
            }, t);
        });
    }
    exports.wait = wait;
});
