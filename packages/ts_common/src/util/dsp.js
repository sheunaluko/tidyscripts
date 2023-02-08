/*
   DSP
 */
export function power(x) {
    var pow = 0;
    for (var i = 0; i < x.length; i++) {
        pow += window.Math.pow(x[i], 2);
    }
    return pow;
}
