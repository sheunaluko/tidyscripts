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
        define(["require", "exports", "../logger"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PortfolioBalancer = exports.MarketTradeType = void 0;
    var logger_1 = require("../logger");
    var MarketTradeType;
    (function (MarketTradeType) {
        MarketTradeType[MarketTradeType["BUY"] = 0] = "BUY";
        MarketTradeType[MarketTradeType["SELL"] = 1] = "SELL";
    })(MarketTradeType = exports.MarketTradeType || (exports.MarketTradeType = {}));
    var PortfolioBalancer = (function () {
        function PortfolioBalancer(params) {
            this.Params = params;
            this.Logger = (0, logger_1.get_logger)({ id: params.logger_id });
            this.last_balance_data = {};
            this.log_mode = "verbose";
            this.state = {
                price_history: [],
                last_price: null,
                r: params.target_ratio,
            };
            this.Params.alpha = (this.Params.alpha || 0.01);
        }
        PortfolioBalancer.prototype.log = function (v) { this.Logger(v); };
        PortfolioBalancer.prototype.balance_portfolio = function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a, base_asset, quote_asset, info, base_amt, quote_amt, base_price, portfolio_value, current_ratio, ratio_error, target_achieved, target_base_amt, base_delta, trade_type, base_market_amt, dp, gate01, result, error, result_info;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = this.Params, base_asset = _a.base_asset, quote_asset = _a.quote_asset;
                            if (this.log_mode == "verbose") {
                                this.log("Balancing...");
                            }
                            return [4, this.get_balance_data()];
                        case 1:
                            info = _b.sent();
                            base_amt = info.base_amt, quote_amt = info.quote_amt, base_price = info.base_price, portfolio_value = info.portfolio_value, current_ratio = info.current_ratio, ratio_error = info.ratio_error, target_achieved = info.target_achieved, target_base_amt = info.target_base_amt, base_delta = info.base_delta, trade_type = info.trade_type, base_market_amt = info.base_market_amt;
                            if (this.log_mode == "verbose") {
                                this.log(info);
                            }
                            if (this.Params.adaptive && this.state.last_price) {
                                dp = base_price - this.state.last_price;
                                gate01 = function (x) { return Math.max(Math.min(1, x), 0); };
                                this.state.r = gate01(this.state.r - this.Params.alpha * dp);
                                this.Params.target_ratio = this.state.r;
                            }
                            this.state.last_price = base_price;
                            this.state.price_history.push(base_price);
                            if (!target_achieved) return [3, 2];
                            if (this.log_mode == "verbose") {
                                this.log("Target ratio already achieved. Returning");
                            }
                            return [2, { balanced: false, balance_needed: false, info: null }];
                        case 2:
                            if (this.log_mode == "verbose") {
                                this.log("Target ratio NOT achieved. Continuing.");
                                this.log("Processing order to ".concat(trade_type, " ").concat(base_market_amt, " ").concat(base_asset));
                            }
                            return [4, this.do_market_trade(trade_type, base_market_amt)];
                        case 3:
                            result = _b.sent();
                            error = result.error, result_info = result.info;
                            return [2, { balanced: !error, balance_needed: true, info: result_info }];
                    }
                });
            });
        };
        PortfolioBalancer.prototype.get_balance_data = function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a, target_ratio, target_precision, quote_asset, base_asset, base_amt, quote_amt, base_price, portfolio_value, current_ratio, ratio_error, target_achieved, target_base_amt, base_delta, trade_type, base_market_amt, info;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = this.Params, target_ratio = _a.target_ratio, target_precision = _a.target_precision, quote_asset = _a.quote_asset, base_asset = _a.base_asset;
                            return [4, this.get_base_balance(base_asset)];
                        case 1:
                            base_amt = _b.sent();
                            return [4, this.get_quote_balance(quote_asset)];
                        case 2:
                            quote_amt = _b.sent();
                            return [4, this.get_base_price(base_asset, quote_asset)];
                        case 3:
                            base_price = _b.sent();
                            portfolio_value = base_amt * base_price + quote_amt;
                            current_ratio = base_amt * base_price / portfolio_value;
                            ratio_error = target_ratio - current_ratio;
                            target_achieved = (Math.abs(ratio_error) < target_precision);
                            target_base_amt = (portfolio_value * target_ratio) / base_price;
                            base_delta = target_base_amt - base_amt;
                            trade_type = (base_delta >= 0) ? MarketTradeType.BUY : MarketTradeType.SELL;
                            base_market_amt = Math.abs(base_delta);
                            info = {
                                base_amt: base_amt,
                                quote_amt: quote_amt,
                                base_price: base_price,
                                portfolio_value: portfolio_value,
                                current_ratio: current_ratio,
                                ratio_error: ratio_error,
                                target_achieved: target_achieved,
                                target_ratio: target_ratio,
                                target_precision: target_precision,
                                target_base_amt: target_base_amt,
                                base_delta: base_delta,
                                trade_type: trade_type,
                                base_market_amt: base_market_amt
                            };
                            this.last_balance_data = info;
                            return [2, info];
                    }
                });
            });
        };
        PortfolioBalancer.prototype.set_log_mode = function (s) {
            if (this.log_mode == "verbose") {
                this.log("Setting log mode to ".concat(s));
                this.log_mode = s;
            }
        };
        return PortfolioBalancer;
    }());
    exports.PortfolioBalancer = PortfolioBalancer;
});
