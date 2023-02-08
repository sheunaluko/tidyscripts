var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import * as R from 'ramda';
import { get_logger } from './logger';
var log = get_logger({ id: "fp" });
var mapIndexed_ = R.addIndex(R.map);
/**
 * Maps a function across a list, where the function receives both index and value as arguments (i,v)
 *
 */
export function map_indexed(f, x) {
    return mapIndexed_(function (value, i) { return f(i, value); }, x);
}
// need to implement deep copy 
export function shallow_copy(o) {
    if (is_array(o)) {
        return clone_array(o);
    }
    if (is_map(o)) {
        return clone(o);
    }
    return o;
}
/* MAPS  */
export function keys(a) {
    return Object.keys(a);
}
export function values(a) {
    var ks = keys(a);
    var cloned = clone(a);
    if (is_empty(ks)) {
        return [];
    }
    else {
        return map(ks, function (k) { return cloned[k]; });
    }
}
export function merge_dictionary(a, b) {
    return Object.assign(clone(a), b);
}
export function merge_dictionaries(ds) {
    return ds.reduce(merge_dictionary, {});
}
export function get(o, a) {
    return o[a];
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
export function update_at(o, path, fn) {
    var ref = o;
    for (var k = 0; k < path.length - 1; k++) {
        ref = ref[k];
    }
    var lk = last(path);
    ref[lk] = fn(ref[lk]);
    return clone(o); //this could be unideal -- maybe should be cloning first? 
}
export function map_items(o) {
    var ks = keys(o);
    var vs = values(o);
    return zip2(ks, vs);
}
export var dict_to_list = map_items;
export function map_over_dic_values(o, f) {
    var vs = values(o);
    var new_vs = map(vs, f);
    return zip_map(keys(o), new_vs);
}
/* ARRAYS  */
export function clone_array(o) {
    return JSON.parse(JSON.stringify(o));
}
/**
 * Return the first element of a list
 *
 */
export function first(arr) {
    return arr[0];
}
/**
 * Return the second element of a list
 *
 */
export function second(arr) {
    return arr[1];
}
/**
 * Return the third element of a list
 *
 */
export function third(arr) {
    return arr[2];
}
/**
 * Return the fourth element of a list
 *
 */
export function fourth(arr) {
    return arr[3];
}
/**
 * Return the last element of a list
 *
 */
export function last(arr) {
    var len = arr.length;
    return arr[len - 1];
}
export function nth(arr, n) {
    return arr[n];
}
export function indexer(i) {
    //returns a function that will index at a given location 
    return function (o) {
        return nth(o, i);
    };
}
export function all_true(arr) {
    return arr.reduce(function (a, b) { return (a && b); });
}
export function any_true(arr) {
    if (is_empty(arr)) {
        return false;
    }
    ;
    return arr.reduce(function (a, b) { return (a || b); });
}
export function all_false(arr) {
    return !any_true(arr);
}
export function any_false(arr) {
    return !all_true(arr);
}
export function repeat(thing, num) {
    var arr = [];
    for (var _i = 0, _a = range(num); _i < _a.length; _i++) {
        var i = _a[_i];
        arr.push(shallow_copy(thing));
    }
    return arr;
}
export function range(n, end) {
    if (end === void 0) { end = null; }
    if (end) {
        var num = (end - n);
        var arr = Array(num).fill(0);
        for (var i = 0; i < arr.length; i++) {
            arr[i] = i + n;
        }
        return arr;
    }
    else {
        var arr = Array(n).fill(0);
        for (var i = 0; i < arr.length; i++) {
            arr[i] = i;
        }
        return arr;
    }
}
export function map(arr, mapper) {
    return arr.map(mapper);
}
/**
 * Creates new list by adding indexes to the input list.
 * Specifically, takes a list of items L and returns same length list Y where Y[index] = [ index , L[index] ]
 *
 */
export function enumerate(x) {
    return map_indexed(function (idx, val) { return [idx, val]; }, x);
}
/**
 * Given a list of objects, extract property 'prop' from each object
 * to create a new list
 * @param prop The property to extract
 * @param list The list to act upon
 */
export function map_prop(prop, list) { return R.map(R.prop(prop))(list); }
/**
 * Given a list of objects, extract property 'prop' from each object
 * to create a new list, and then reduce this list with the given
 * reducer and initial accumulator
 * @param prop The property to extract
 * @param reducer The reducer to use
 * @param acc The initiall acc value
 * @param list The list to act upon
 */
export function map_prop_reduce(prop, reducer, acc, list) {
    return R.reduce(reducer, acc, map_prop(prop, list));
}
/**
 *  Takes an array of X arrays with Y values each, and produces an array of Y arrays with
 *  X values each. The first array is the concatenation of the first elemenent of each subarray.
 * The second returned array is the concatenation of the second element of each subarray.
 * And so forth.
 *
 * ```
 * //create a dictionary from separate key/value arrays
 * let keys = ['a', 'b', 'c'] ; let values = ['v1', 'v2' ,'v3]
 * let pairs = concat_accross_index( [keys,values]  )
 * //  > [ ['a', 'v1'] , ['b', 'v2'] ... ]
 * let dic  = Object.fromEntries( pairs )
 * ```
 */
export function concat_accross_index(arrs) {
    var result = [];
    var res_len = arrs[0].length;
    var arr_len = arrs.length;
    for (var i = 0; i < res_len; i++) {
        var tmp = new Array();
        for (var x = 0; x < arr_len; x++) {
            tmp.push(arrs[x][i]);
        }
        result.push(tmp);
    }
    return result;
}
/**
 * Clone an object to produce an identical yet distinct reference and corresponding object
 * Uses JSON.parse(JSON.stringify(o))
 */
export function clone(o) {
    return JSON.parse(JSON.stringify(o));
}
/**
 * Same as Array.push however clones the array first
 * @param arr - the array
 * @param o - object to add
 */
export function im_push(arr, o) {
    var new_a = clone(arr);
    new_a.push(o);
    return new_a;
}
/**
 * Removes a value from an array if '==' is true.
 * @param arr - the array
 * @param o - object to remove
 */
export function im_arr_rm(arr, o) {
    var narr = clone(arr);
    return narr.filter(function (x) { return !(x == o); });
}
/**
 * Creates comparator function based on property value
 * From https://stackoverflow.com/questions/1129216/sort-array-of-objects-by-string-property-value
 * Returns a comparator function for use in Array.sort
 * @param property - The prop to sort by
 */
export function sort_by_prop(property) {
    var sortOrder = 1;
    if (property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a, b) {
        /* next line works with strings and numbers,
         * and you may want to customize it to your needs
         */
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    };
}
/**
 * Paritions an array into k groups of n items each
 * @param arr - Array to partition
 * @param n - size of each parition
 */
export function partition(arr, n) {
    var len = Math.ceil(arr.length / n);
    var res = Array(len).fill(null).map(function (x) { return (new Array()); });
    var res_index = 0;
    var group = [];
    for (var i = 0; i < arr.length; i++) {
        if ((i % n) == 0 && (i != 0)) {
            //this is a new set
            res_index += 1;
        }
        res[res_index].push(arr[i]);
    }
    return res;
}
export function enumermap(os, f) {
    var results = [];
    //@ts-ignore 
    for (var _i = 0, _a = enumerate(os); _i < _a.length; _i++) {
        var _b = _a[_i], i = _b[0], o = _b[1];
        results.push(f(i, o));
    }
    return results;
}
export function concat(a, b) {
    return a.concat(b);
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
export function zip2(a1, a2) {
    var ret = [];
    for (var i = 0; i < a1.length; i++) {
        ret.push([a1[i], a2[i]]);
    }
    return ret;
}
export var zip = zip2;
export function list_to_dict(kvs) {
    var result = {};
    for (var _i = 0, kvs_1 = kvs; _i < kvs_1.length; _i++) {
        var _a = kvs_1[_i], k = _a[0], v = _a[1];
        result[k] = v;
    }
    return result;
}
export function zip_map(a1, a2) {
    return list_to_dict(zip(a1, a2));
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
export function format(s, _replacers) {
    var replacers = clone_array(_replacers);
    var nxt = replacers.shift();
    var ret = s;
    while (nxt) {
        ret = ret.replace("{}", String(nxt));
        nxt = replacers.shift();
    }
    return ret;
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
export function multiplier(n) {
    return function (x) {
        return x * n;
    };
}
export function diff(a) {
    var result = [];
    for (var i = 1; i < a.length; i++) {
        result.push(a[i] - a[i - 1]);
    }
    return result;
}
// misc
export function equals(a, b) {
    return (a == b);
}
/**
 * Creates a debouncer function
 */
export function make_debouncer(d, cb) {
    var state = {
        attempt_ref: null
    };
    return function (args) {
        if (state.attempt_ref) {
            clearTimeout(state.attempt_ref); //cancel any previously stored callback attempt
        }
        //and reset with a new one
        state.attempt_ref = setTimeout(function () {
            cb(args);
        }, d);
    };
}
/**
 * Takes an object whos keys are fields in a dictionary and values are functions and calls each function with a supplied argument and assings the result to the corresping key of the return object
 * @param fd - The "function dictionary" that maps keys to a transformer function
 * @param arg  - The argument to the transformer function
 * @returns ret - An object whose keys index the corresponding result of the transformer function
 * ```
 * let fd = { 'a' : ()=>"hi" , 'b' : (e)=>e.toLowerCase }
 * let res = apply_function_dictionary_to_object(fd, "HELLO")
 * //returns { 'a' : "hi" , 'b' : "hello" }
 * ```
 */
export function apply_function_dictionary_to_object(fd, o) {
    var ret = {};
    var errors = [];
    R.keys(fd).map(function (k) {
        try {
            ret[k] = fd[k](o);
        }
        catch (e) {
            errors.push(e);
            ret[k] = null;
        }
    });
    if (errors.length) {
        log("Error while applying function to dictionary");
        log(errors);
        log(ret);
    }
    return ret;
}
/**
 * Same as apply_function_dictionary_to_object however assumes asynchronous transformer functions. Takes an object whos keys are fields in a dictionary and values are functions and calls each function with a supplied argument and assings the result to the corresping key of the return object
 * @param fd - The "function dictionary" that maps keys to a transformer function
 * @param arg  - The argument to the transformer function
 * @returns ret - An object whose keys index the corresponding result of the transformer function
 * ```
 * let fd = { 'a' : ()=>"hi" , 'b' : (e)=>e.toLowerCase }
 * let res = apply_function_dictionary_to_object(fd, "HELLO")
 * //returns { 'a' : "hi" , 'b' : "hello" }
 * ```
 */
export function async_apply_function_dictionary_to_object(fd, o) {
    return __awaiter(this, void 0, void 0, function () {
        var ret, errors, results;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    ret = {};
                    errors = [];
                    results = R.keys(fd).map(function (k) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, _b, e_1;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    _c.trys.push([0, 2, , 3]);
                                    _a = ret;
                                    _b = k;
                                    return [4 /*yield*/, fd[k](o)];
                                case 1:
                                    _a[_b] = _c.sent();
                                    return [3 /*break*/, 3];
                                case 2:
                                    e_1 = _c.sent();
                                    errors.push(e_1);
                                    ret[k] = null;
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); });
                    return [4 /*yield*/, Promise.all(results)];
                case 1:
                    _a.sent();
                    if (errors.length) {
                        log("Error while applying function to dictionary");
                        log(errors);
                        log(ret);
                    }
                    return [2 /*return*/, ret];
            }
        });
    });
}
