var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
        define(["require", "exports", "./portfolio_balancer_lib"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BacktestBalancer = void 0;
    var pbl = require("./portfolio_balancer_lib");
    var BacktestBalancer = (function (_super) {
        __extends(BacktestBalancer, _super);
        function BacktestBalancer(p) {
            var _this = _super.call(this, p) || this;
            _this.data = p.data;
            _this.current_index = -1;
            _this.portfolio = Object.assign({}, p.initial_portfolio);
            _this.initial_portfolio = Object.assign({}, p.initial_portfolio);
            _this.rebalances = [];
            _this.slippage = p.slippage;
            _this.fee = p.fee;
            _this.transactions_costs = {
                fees: {
                    base: 0,
                    quote: 0,
                },
                slippage: {
                    base: 0,
                    quote: 0,
                }
            };
            _this.balance_portfolio_series = [];
            _this.hodl_portfolio_series = [];
            _this.ratio_series = [];
            return _this;
        }
        BacktestBalancer.prototype.get_quote_balance = function (qa) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2, this.portfolio.quote_balance];
                });
            });
        };
        BacktestBalancer.prototype.get_base_balance = function (ba) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2, this.portfolio.base_balance];
                });
            });
        };
        BacktestBalancer.prototype.get_base_price = function (ba, qa) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2, (this.data[this.current_index]).p];
                });
            });
        };
        BacktestBalancer.prototype.do_market_trade = function (trade_type, base_amt) {
            return __awaiter(this, void 0, void 0, function () {
                var base_price, current_data, p, t, new_base, new_quote, new_base_amt, new_quote_amt;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4, this.get_base_price("", "")];
                        case 1:
                            base_price = _a.sent();
                            current_data = this.data[this.current_index];
                            if (base_price != current_data.p) {
                                this.log("Sanity check failed! - there is a problem with price indexing");
                                process.exit(1);
                            }
                            p = current_data.p, t = current_data.t;
                            switch (trade_type) {
                                case pbl.MarketTradeType.BUY:
                                    new_base = base_amt * (1 - this.fee);
                                    new_quote = -(base_amt * p) * (1 + this.slippage);
                                    this.transactions_costs.fees.base += base_amt * this.fee;
                                    this.transactions_costs.slippage.quote += (base_amt * p) * (this.slippage);
                                    break;
                                case pbl.MarketTradeType.SELL:
                                    new_base = -base_amt;
                                    new_quote = (base_amt * p) * (1 - this.fee) * (1 - this.slippage);
                                    this.transactions_costs.fees.quote += (base_amt * p) * (this.fee);
                                    this.transactions_costs.slippage.quote += (base_amt * p) * (this.slippage);
                                    break;
                            }
                            new_base_amt = this.portfolio.base_balance += new_base;
                            new_quote_amt = this.portfolio.quote_balance += new_quote;
                            this.portfolio = {
                                base_balance: new_base_amt,
                                quote_balance: new_quote_amt
                            };
                            this.rebalances.push({
                                index: this.current_index,
                                p: p,
                                t: t,
                                trade_type: trade_type,
                                base_amt: base_amt,
                                quote_amt: (base_amt * p),
                                portfolio: this.get_portfolio_value_and_time(this.portfolio, p, t),
                                hodl_portfolio: this.get_portfolio_value_and_time(this.initial_portfolio, p, t),
                                cummulative_transactions_costs: {
                                    raw: Object.assign({}, this.transactions_costs),
                                    values: this.get_transactions_costs_values(this.transactions_costs, p)
                                },
                            });
                            return [2, { error: false, info: null }];
                    }
                });
            });
        };
        BacktestBalancer.prototype.symbol_generator = function (ba, qa) { return "BACKTESTER"; };
        BacktestBalancer.prototype.process_data = function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a, p, t;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            this.current_index += 1;
                            return [4, this.balance_portfolio()];
                        case 1:
                            _b.sent();
                            _a = this.data[this.current_index], p = _a.p, t = _a.t;
                            this.hodl_portfolio_series.push(this.get_portfolio_value_and_time(this.initial_portfolio, p, t));
                            this.balance_portfolio_series.push(this.get_portfolio_value_and_time(this.portfolio, p, t));
                            this.ratio_series.push(this.Params.target_ratio);
                            return [2];
                    }
                });
            });
        };
        BacktestBalancer.prototype.get_portfolio_value_and_time = function (portfolio, p, t) {
            var value = portfolio.base_balance * p + portfolio.quote_balance;
            return {
                base_balance: portfolio.base_balance,
                quote_balance: portfolio.quote_balance,
                value: value,
                p: p,
                t: t
            };
        };
        BacktestBalancer.prototype.get_transactions_costs_values = function (tc, p) {
            var fees = tc.fees, slippage = tc.slippage;
            var fee_cost = fees.base * p + fees.quote;
            var slippage_cost = slippage.base * p + slippage.quote;
            var total = fee_cost + slippage_cost;
            return {
                fee_cost: fee_cost,
                slippage_cost: slippage_cost,
                total: total
            };
        };
        BacktestBalancer.prototype.backtest = function () {
            return __awaiter(this, void 0, void 0, function () {
                var len, x;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.log("Starting backtest...");
                            len = this.data.length;
                            x = 0;
                            _a.label = 1;
                        case 1:
                            if (!(x < len)) return [3, 4];
                            return [4, this.process_data()];
                        case 2:
                            _a.sent();
                            if ((x % 100) == 0) {
                                this.log("Progress = ".concat(x, "/").concat(len));
                            }
                            _a.label = 3;
                        case 3:
                            x++;
                            return [3, 1];
                        case 4:
                            this.log("Done");
                            return [2];
                    }
                });
            });
        };
        return BacktestBalancer;
    }(pbl.PortfolioBalancer));
    exports.BacktestBalancer = BacktestBalancer;
});
