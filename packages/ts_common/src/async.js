/*
   Async utility functions
 */
var ms = function () { return performance.now(); };
export var status;
(function (status) {
    status[status["TIMEOUT"] = 0] = "TIMEOUT";
})(status || (status = {}));
/**
 * Waits until the specified function "f" returns true to resume executation.
 * Checks every "rate" milliseconds to see if f is true.
 * Timeouts after "timeout" ms and returns "True" for timeout
 * ```
 * let timeout = await wait_until( f, 2000, 500 ) ;
 * if (timeout) { ... }  else {  }  ;
 * ```
 */
export function wait_until(f, timeout, rate) {
    var t_start = ms();
    rate = rate || 200;
    var p = new Promise(function (resolve, reject) {
        var id = setInterval(function () {
            var t_now = ms();
            if (f()) {
                //condition is met 
                resolve(false);
                clearInterval(id);
            }
            else {
                var elapsed = t_now - t_start;
                if (timeout && elapsed >= timeout) {
                    resolve(true); // reports an timeout
                    clearInterval(id);
                }
            }
        }, rate);
    });
    //return the promise now 
    return p;
}
/**
 * Waits t milliseconds before continuing execution
 * ```
 * await wait(500) ; //"sleeps" for 500ms
 * ```
 */
export function wait(t) {
    return new Promise(function (res, rej) {
        setTimeout(function () {
            res(status.TIMEOUT);
        }, t);
    });
}
