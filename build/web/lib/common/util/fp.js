/* MAPS  */
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
export function is_empty_map(o) {
    return (is_map(o) && is_zero(len(keys(o))));
}
/* ARRAYS  */
export function first(arr) {
    return arr[0];
}
export function last(arr) {
    var len = arr.length;
    return arr[len - 1];
}
export function nth(arr, n) {
    return arr[n];
}
export function all_true(arr) {
    return arr.reduce(function (a, b) { return (a && b); });
}
export function any_true(arr) {
    return arr.reduce(function (a, b) { return (a || b); });
}
export function all_false(arr) {
    return !any_true(arr);
}
export function any_false(arr) {
    return !all_true(arr);
}
export function repeat(thing, num) {
    return Array(num).fill(thing);
}
export function map(arr, mapper) {
    return arr.map(mapper);
}
export function map_get(o, k) {
    return map(o, getter(k));
}
export function map_set(o, k, val) {
    return map(o, setter(k, val));
}
export function map_set_im(o, k, val) {
    return map(o, setter_im(k, val));
}
export function is_zero(n) { return (n == 0); }
export function len(arr) {
    return arr.length;
}
export function is_empty_array(o) {
    return (is_array(o) && is_zero(len(o)));
}
export function is_empty(o) {
    return (is_null(o) || is_undefined(o) || is_empty_array(o) || is_empty_string(o) || is_empty_map(o));
}
export function not_empty(o) { return !is_empty(o); }
export function filter(o, fn) {
    return o.filter(fn);
}
export function filter_key(os, k, fn) {
    return filter(os, function (o) { return fn(get(o, k)); });
}
export function filter_key_equals(os, k, val) {
    return filter_key(os, k, function (a) { return a == val; });
}
export function remove_empty(o) {
    return filter(o, not_empty);
}
export function any_is_array(o) {
    return any_true(map(o, is_array));
}
export function flat_once(o) {
    var tmp = o.flat();
    return tmp;
}
export function recursive_flat(o) {
    if (any_is_array(o)) {
        return recursive_flat(flat_once(o));
    }
    else {
        return o;
    }
}
export function recursive_flat_remove_empty(arr) {
    return remove_empty(recursive_flat(arr));
}
export function partition(arr, num) {
    var partitions = [];
    var curr = [];
    for (var i = 0; i < arr.length; i++) {
        curr.push(arr[i]);
        if (len(curr) == num) {
            partitions.push(curr);
            curr = [];
        }
    }
    partitions.push(curr);
    return remove_empty(partitions);
}
/*  TYPES  */
export function is_null(o) { return (o == null); }
export function is_undefined(o) { return (o == undefined); }
export function is_something(o) { return !(is_null(o) || is_undefined(o)); }
export function is_array(o) {
    return (is_something(o) && o.constructor == Array);
}
export function is_string(o) {
    return (is_something(o) && o.constructor == String);
}
export function is_object(o) {
    return (is_something(o) && o.constructor == Object);
}
export function is_map(o) {
    return (is_something(o) && is_object(o) && (!is_array(o)));
}
/* Strings */
export function is_empty_string(o) {
    return (o == "");
}
export function substring(str, s, e) {
    return str.substring(s, e);
}
export function nchars(str, n) {
    return substring(str, 0, n);
}
export function join(arr, ch) {
    var result = arr.join(ch);
    return result;
}
export function joiner(ch) {
    return function (s) {
        return join(s, ch);
    };
}
export function split(s, ch) {
    return s.split(ch);
}
/* MATH */
export function add(a, b) { return a + b; }
export function subtract(a, b) { return a - b; }
export function multiply(a, b) { return a * b; }
export function divide(a, b) { return a / b; }
export function adder(n) {
    return function (x) {
        return x + n;
    };
}
export function subtractor(n) {
    return function (x) {
        return x - n;
    };
}
export function divider(n) {
    return function (x) {
        return x / n;
    };
}
export function multuplier(n) {
    return function (x) {
        return x * n;
    };
}
// misc 
export function equals(a, b) {
    return (a == b);
}
//# sourceMappingURL=fp.js.map