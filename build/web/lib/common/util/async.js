/*
   Async utility functions
 */
var ms = function () { return performance.now(); };
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
export function wait(t) {
    return new Promise(function (res, rej) {
        setTimeout(function () {
            res(true);
        }, t);
    });
}
//# sourceMappingURL=async.js.map