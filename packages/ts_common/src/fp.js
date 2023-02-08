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
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "ramda", "./logger"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.async_apply_function_dictionary_to_object = exports.apply_function_dictionary_to_object = exports.make_debouncer = exports.equals = exports.diff = exports.multiplier = exports.divider = exports.subtractor = exports.adder = exports.divide = exports.multiply = exports.subtract = exports.add = exports.format = exports.split = exports.joiner = exports.join = exports.nchars = exports.substring = exports.is_empty_string = exports.is_map = exports.is_object = exports.is_string = exports.is_array = exports.is_something = exports.is_undefined = exports.is_null = exports.zip_map = exports.list_to_dict = exports.zip = exports.zip2 = exports.recursive_flat_remove_empty = exports.recursive_flat = exports.flat_once = exports.any_is_array = exports.remove_empty = exports.filter_key_equals = exports.filter_key = exports.filter = exports.not_empty = exports.is_empty = exports.is_empty_array = exports.len = exports.is_zero = exports.map_set_im = exports.map_set = exports.map_get = exports.concat = exports.enumermap = exports.partition = exports.sort_by_prop = exports.im_arr_rm = exports.im_push = exports.clone = exports.concat_accross_index = exports.map_prop_reduce = exports.map_prop = exports.enumerate = exports.map = exports.range = exports.repeat = exports.any_false = exports.all_false = exports.any_true = exports.all_true = exports.indexer = exports.nth = exports.last = exports.fourth = exports.third = exports.second = exports.first = exports.clone_array = exports.map_over_dic_values = exports.dict_to_list = exports.map_items = exports.update_at = exports.is_empty_map = exports.setter_im = exports.setter = exports.getter = exports.set_im = exports.set = exports.get = exports.merge_dictionaries = exports.merge_dictionary = exports.values = exports.keys = exports.shallow_copy = exports.map_indexed = void 0;
    var R = require("ramda");
    var logger_1 = require("./logger");
    var log = (0, logger_1.get_logger)({ id: "fp" });
    var mapIndexed_ = R.addIndex(R.map);
    function map_indexed(f, x) {
        return mapIndexed_(function (value, i) { return f(i, value); }, x);
    }
    exports.map_indexed = map_indexed;
    function shallow_copy(o) {
        if (is_array(o)) {
            return clone_array(o);
        }
        if (is_map(o)) {
            return clone(o);
        }
        return o;
    }
    exports.shallow_copy = shallow_copy;
    function keys(a) {
        return Object.keys(a);
    }
    exports.keys = keys;
    function values(a) {
        var ks = keys(a);
        var cloned = clone(a);
        if (is_empty(ks)) {
            return [];
        }
        else {
            return map(ks, function (k) { return cloned[k]; });
        }
    }
    exports.values = values;
    function merge_dictionary(a, b) {
        return Object.assign(clone(a), b);
    }
    exports.merge_dictionary = merge_dictionary;
    function merge_dictionaries(ds) {
        return ds.reduce(merge_dictionary, {});
    }
    exports.merge_dictionaries = merge_dictionaries;
    function get(o, a) {
        return o[a];
    }
    exports.get = get;
    function set(o, a, val) {
        o[a] = val;
        return o;
    }
    exports.set = set;
    function set_im(o, a, val) {
        var cpy = clone(o);
        cpy[a] = val;
        return cpy;
    }
    exports.set_im = set_im;
    function getter(a) {
        return function (o) {
            return o[a];
        };
    }
    exports.getter = getter;
    function setter(a, val) {
        return function (o) {
            return set(o, a, val);
        };
    }
    exports.setter = setter;
    function setter_im(a, val) {
        return function (o) {
            return set(o, a, val);
        };
    }
    exports.setter_im = setter_im;
    function is_empty_map(o) {
        return (is_map(o) && is_zero(len(keys(o))));
    }
    exports.is_empty_map = is_empty_map;
    function update_at(o, path, fn) {
        var ref = o;
        for (var k = 0; k < path.length - 1; k++) {
            ref = ref[k];
        }
        var lk = last(path);
        ref[lk] = fn(ref[lk]);
        return clone(o);
    }
    exports.update_at = update_at;
    function map_items(o) {
        var ks = keys(o);
        var vs = values(o);
        return zip2(ks, vs);
    }
    exports.map_items = map_items;
    exports.dict_to_list = map_items;
    function map_over_dic_values(o, f) {
        var vs = values(o);
        var new_vs = map(vs, f);
        return zip_map(keys(o), new_vs);
    }
    exports.map_over_dic_values = map_over_dic_values;
    function clone_array(o) {
        return JSON.parse(JSON.stringify(o));
    }
    exports.clone_array = clone_array;
    function first(arr) {
        return arr[0];
    }
    exports.first = first;
    function second(arr) {
        return arr[1];
    }
    exports.second = second;
    function third(arr) {
        return arr[2];
    }
    exports.third = third;
    function fourth(arr) {
        return arr[3];
    }
    exports.fourth = fourth;
    function last(arr) {
        var len = arr.length;
        return arr[len - 1];
    }
    exports.last = last;
    function nth(arr, n) {
        return arr[n];
    }
    exports.nth = nth;
    function indexer(i) {
        return function (o) {
            return nth(o, i);
        };
    }
    exports.indexer = indexer;
    function all_true(arr) {
        return arr.reduce(function (a, b) { return (a && b); });
    }
    exports.all_true = all_true;
    function any_true(arr) {
        if (is_empty(arr)) {
            return false;
        }
        ;
        return arr.reduce(function (a, b) { return (a || b); });
    }
    exports.any_true = any_true;
    function all_false(arr) {
        return !any_true(arr);
    }
    exports.all_false = all_false;
    function any_false(arr) {
        return !all_true(arr);
    }
    exports.any_false = any_false;
    function repeat(thing, num) {
        var arr = [];
        for (var _i = 0, _a = range(num); _i < _a.length; _i++) {
            var i = _a[_i];
            arr.push(shallow_copy(thing));
        }
        return arr;
    }
    exports.repeat = repeat;
    function range(n, end) {
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
    exports.range = range;
    function map(arr, mapper) {
        return arr.map(mapper);
    }
    exports.map = map;
    function enumerate(x) {
        return map_indexed(function (idx, val) { return [idx, val]; }, x);
    }
    exports.enumerate = enumerate;
    function map_prop(prop, list) { return R.map(R.prop(prop))(list); }
    exports.map_prop = map_prop;
    function map_prop_reduce(prop, reducer, acc, list) {
        return R.reduce(reducer, acc, map_prop(prop, list));
    }
    exports.map_prop_reduce = map_prop_reduce;
    function concat_accross_index(arrs) {
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
    exports.concat_accross_index = concat_accross_index;
    function clone(o) {
        return JSON.parse(JSON.stringify(o));
    }
    exports.clone = clone;
    function im_push(arr, o) {
        var new_a = clone(arr);
        new_a.push(o);
        return new_a;
    }
    exports.im_push = im_push;
    function im_arr_rm(arr, o) {
        var narr = clone(arr);
        return narr.filter(function (x) { return !(x == o); });
    }
    exports.im_arr_rm = im_arr_rm;
    function sort_by_prop(property) {
        var sortOrder = 1;
        if (property[0] === "-") {
            sortOrder = -1;
            property = property.substr(1);
        }
        return function (a, b) {
            var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
            return result * sortOrder;
        };
    }
    exports.sort_by_prop = sort_by_prop;
    function partition(arr, n) {
        var len = Math.ceil(arr.length / n);
        var res = Array(len).fill(null).map(function (x) { return (new Array()); });
        var res_index = 0;
        var group = [];
        for (var i = 0; i < arr.length; i++) {
            if ((i % n) == 0 && (i != 0)) {
                res_index += 1;
            }
            res[res_index].push(arr[i]);
        }
        return res;
    }
    exports.partition = partition;
    function enumermap(os, f) {
        var results = [];
        for (var _i = 0, _a = enumerate(os); _i < _a.length; _i++) {
            var _b = _a[_i], i = _b[0], o = _b[1];
            results.push(f(i, o));
        }
        return results;
    }
    exports.enumermap = enumermap;
    function concat(a, b) {
        return a.concat(b);
    }
    exports.concat = concat;
    function map_get(o, k) {
        return map(o, getter(k));
    }
    exports.map_get = map_get;
    function map_set(o, k, val) {
        return map(o, setter(k, val));
    }
    exports.map_set = map_set;
    function map_set_im(o, k, val) {
        return map(o, setter_im(k, val));
    }
    exports.map_set_im = map_set_im;
    function is_zero(n) { return (n == 0); }
    exports.is_zero = is_zero;
    function len(arr) {
        return arr.length;
    }
    exports.len = len;
    function is_empty_array(o) {
        return (is_array(o) && is_zero(len(o)));
    }
    exports.is_empty_array = is_empty_array;
    function is_empty(o) {
        return (is_null(o) || is_undefined(o) || is_empty_array(o) || is_empty_string(o) || is_empty_map(o));
    }
    exports.is_empty = is_empty;
    function not_empty(o) { return !is_empty(o); }
    exports.not_empty = not_empty;
    function filter(o, fn) {
        return o.filter(fn);
    }
    exports.filter = filter;
    function filter_key(os, k, fn) {
        return filter(os, function (o) { return fn(get(o, k)); });
    }
    exports.filter_key = filter_key;
    function filter_key_equals(os, k, val) {
        return filter_key(os, k, function (a) { return a == val; });
    }
    exports.filter_key_equals = filter_key_equals;
    function remove_empty(o) {
        return filter(o, not_empty);
    }
    exports.remove_empty = remove_empty;
    function any_is_array(o) {
        return any_true(map(o, is_array));
    }
    exports.any_is_array = any_is_array;
    function flat_once(o) {
        var tmp = o.flat();
        return tmp;
    }
    exports.flat_once = flat_once;
    function recursive_flat(o) {
        if (any_is_array(o)) {
            return recursive_flat(flat_once(o));
        }
        else {
            return o;
        }
    }
    exports.recursive_flat = recursive_flat;
    function recursive_flat_remove_empty(arr) {
        return remove_empty(recursive_flat(arr));
    }
    exports.recursive_flat_remove_empty = recursive_flat_remove_empty;
    function zip2(a1, a2) {
        var ret = [];
        for (var i = 0; i < a1.length; i++) {
            ret.push([a1[i], a2[i]]);
        }
        return ret;
    }
    exports.zip2 = zip2;
    exports.zip = zip2;
    function list_to_dict(kvs) {
        var result = {};
        for (var _i = 0, kvs_1 = kvs; _i < kvs_1.length; _i++) {
            var _a = kvs_1[_i], k = _a[0], v = _a[1];
            result[k] = v;
        }
        return result;
    }
    exports.list_to_dict = list_to_dict;
    function zip_map(a1, a2) {
        return list_to_dict((0, exports.zip)(a1, a2));
    }
    exports.zip_map = zip_map;
    function is_null(o) { return (o == null); }
    exports.is_null = is_null;
    function is_undefined(o) { return (o == undefined); }
    exports.is_undefined = is_undefined;
    function is_something(o) { return !(is_null(o) || is_undefined(o)); }
    exports.is_something = is_something;
    function is_array(o) {
        return (is_something(o) && o.constructor == Array);
    }
    exports.is_array = is_array;
    function is_string(o) {
        return (is_something(o) && o.constructor == String);
    }
    exports.is_string = is_string;
    function is_object(o) {
        return (is_something(o) && o.constructor == Object);
    }
    exports.is_object = is_object;
    function is_map(o) {
        return (is_something(o) && is_object(o) && (!is_array(o)));
    }
    exports.is_map = is_map;
    function is_empty_string(o) {
        return (o == "");
    }
    exports.is_empty_string = is_empty_string;
    function substring(str, s, e) {
        return str.substring(s, e);
    }
    exports.substring = substring;
    function nchars(str, n) {
        return substring(str, 0, n);
    }
    exports.nchars = nchars;
    function join(arr, ch) {
        var result = arr.join(ch);
        return result;
    }
    exports.join = join;
    function joiner(ch) {
        return function (s) {
            return join(s, ch);
        };
    }
    exports.joiner = joiner;
    function split(s, ch) {
        return s.split(ch);
    }
    exports.split = split;
    function format(s, _replacers) {
        var replacers = clone_array(_replacers);
        var nxt = replacers.shift();
        var ret = s;
        while (nxt) {
            ret = ret.replace("{}", String(nxt));
            nxt = replacers.shift();
        }
        return ret;
    }
    exports.format = format;
    function add(a, b) { return a + b; }
    exports.add = add;
    function subtract(a, b) { return a - b; }
    exports.subtract = subtract;
    function multiply(a, b) { return a * b; }
    exports.multiply = multiply;
    function divide(a, b) { return a / b; }
    exports.divide = divide;
    function adder(n) {
        return function (x) {
            return x + n;
        };
    }
    exports.adder = adder;
    function subtractor(n) {
        return function (x) {
            return x - n;
        };
    }
    exports.subtractor = subtractor;
    function divider(n) {
        return function (x) {
            return x / n;
        };
    }
    exports.divider = divider;
    function multiplier(n) {
        return function (x) {
            return x * n;
        };
    }
    exports.multiplier = multiplier;
    function diff(a) {
        var result = [];
        for (var i = 1; i < a.length; i++) {
            result.push(a[i] - a[i - 1]);
        }
        return result;
    }
    exports.diff = diff;
    function equals(a, b) {
        return (a == b);
    }
    exports.equals = equals;
    function make_debouncer(d, cb) {
        var state = {
            attempt_ref: null
        };
        return function (args) {
            if (state.attempt_ref) {
                clearTimeout(state.attempt_ref);
            }
            state.attempt_ref = setTimeout(function () {
                cb(args);
            }, d);
        };
    }
    exports.make_debouncer = make_debouncer;
    function apply_function_dictionary_to_object(fd, o) {
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
    exports.apply_function_dictionary_to_object = apply_function_dictionary_to_object;
    function async_apply_function_dictionary_to_object(fd, o) {
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
                                        return [4, fd[k](o)];
                                    case 1:
                                        _a[_b] = _c.sent();
                                        return [3, 3];
                                    case 2:
                                        e_1 = _c.sent();
                                        errors.push(e_1);
                                        ret[k] = null;
                                        return [3, 3];
                                    case 3: return [2];
                                }
                            });
                        }); });
                        return [4, Promise.all(results)];
                    case 1:
                        _a.sent();
                        if (errors.length) {
                            log("Error while applying function to dictionary");
                            log(errors);
                            log(ret);
                        }
                        return [2, ret];
                }
            });
        });
    }
    exports.async_apply_function_dictionary_to_object = async_apply_function_dictionary_to_object;
});
