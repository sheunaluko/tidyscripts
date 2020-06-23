/* OBJECTS  */
export function keys(a) {
    return Object.keys(a);
}
export function values(a) {
    var ks = keys(a);
    return map(ks, function (k) { return a[k]; });
}
export function get(o, a) {
    return o[a];
}
export function clone(o) {
    var cpy = Object.assign({}, o);
    return cpy;
}
export function set(o, a, val) {
    o[a] = val;
    return o;
}
export function set_im(o, a, val) {
    var cpy = clone(o);
    cpy[a] = val;
    return cpy;
}
export function getter(a) {
    return function (o) {
        return o[a];
    };
}
export function setter(a, val) {
    return function (o) {
        return set(o, a, val);
    };
}
export function setter_im(a, val) {
    return function (o) {
        return set(o, a, val);
    };
}
/* ARRAYS  */
export function all_true(arr) {
    return arr.reduce(function (a, b) { return (a && b); });
}
export function repeat(thing, num) {
    return Array(num).fill(thing);
}
export function map(arr, mapper) {
    return arr.map(mapper);
}
/* Functions */
export function inc(n) {
    return function (x) {
        return x + n;
    };
}
//# sourceMappingURL=fp.js.map