"use strict";
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
exports.__esModule = true;
var hl = require("../hyperloop/index.ts");
var util_ts_1 = require("../util.ts");
var common = require("../../common/util/index.ts");
var log = common.Logger("hli");
// 1) start a hyperloop server  
var s_ops = {
    port: 9500
};
var hl_server = new hl.server.Server(s_ops);
hl_server.initialize();
log("Server initiated");
//pause 
var _ = await common.asnc.wait(2000);
// 2) create and connect a hyperloop client 
var hc1 = new hl.client.Client({ host: "127.0.0.1",
    id: "hc1",
    port: s_ops.port });
await hc1.connect();
log("Client connected");
// 3) register the default providers  
var default_providers = [
    {
        id: "sattsys.hyperloop.http_json",
        handler: function (args) {
            return __awaiter(this, void 0, void 0, function () {
                var result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, util_ts_1.base_http_json(args.url)];
                        case 1:
                            result = _a.sent();
                            return [2 /*return*/, result];
                    }
                });
            });
        },
        args_info: [["url", "string"]]
    },
    {
        id: "sattsys.hyperloop.http",
        handler: function (args) {
            return __awaiter(this, void 0, void 0, function () {
                var result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, util_ts_1.base_http(args.url)];
                        case 1:
                            result = _a.sent();
                            return [2 /*return*/, result];
                    }
                });
            });
        },
        args_info: [["url", "string"]]
    },
    {
        id: "sattsys.hyperloop.post_json",
        handler: function (args) {
            return __awaiter(this, void 0, void 0, function () {
                var result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, util_ts_1.post_json_get_json(args.url, args.msg)];
                        case 1:
                            result = _a.sent();
                            return [2 /*return*/, result];
                    }
                });
            });
        },
        args_info: [["url", "string"], ["msg", "json argument to POST"]]
    }
];
//register the functions 
default_providers.map(function (r) { return hc1.register_function(r); });
exports["default"] = {
    hc1: hc1,
    hl_server: hl_server
};
/*
log("Testing stuff...")

let result = await post_json_get_json("https://query.wikidata.org/w/api.php",  {
    action : "wbgetentities" ,
    format : 'json' ,
    ids : "Q5" ,
    titles : "",
    sites : "enwiki" ,
})

console.log(result)
*/
