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
        define(["require", "exports", "ethers", "../trading/portfolio_balancer_lib", "@uniswap/sdk", "./abis/index", "./utils", "./smart_wallet"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.UniV2Balancer = exports.EVMBalancer = void 0;
    var ethers_1 = require("ethers");
    var pbl = require("../trading/portfolio_balancer_lib");
    var UNISWAP = require("@uniswap/sdk");
    var abis = require("./abis/index");
    var utils_1 = require("./utils");
    var smart_wallet_1 = require("./smart_wallet");
    var EVMBalancer = (function (_super) {
        __extends(EVMBalancer, _super);
        function EVMBalancer(params) {
            var _this = _super.call(this, params) || this;
            _this.wallet = params.smartWallet;
            return _this;
        }
        return EVMBalancer;
    }(pbl.PortfolioBalancer));
    exports.EVMBalancer = EVMBalancer;
    var UniV2Balancer = (function (_super) {
        __extends(UniV2Balancer, _super);
        function UniV2Balancer(ammParams) {
            var _this = _super.call(this, ammParams) || this;
            _this.params = ammParams;
            _this.routerContract = null;
            _this.poolContract = null;
            _this.token0 = null;
            _this.token1 = null;
            _this.token0Contract = null;
            _this.token1Contract = null;
            _this.tokens = null;
            _this.gasLimitMultiple = 1.2;
            return _this;
        }
        UniV2Balancer.prototype.init = function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a, router_address, pool_address, chain_id, token0, token1, token0_is_base_asset, v2abi, contract_address, decimals, symbol, name_1, contract_address, decimals, symbol, name_2;
                return __generator(this, function (_b) {
                    this.log("Initializing");
                    _a = this.params, router_address = _a.router_address, pool_address = _a.pool_address, chain_id = _a.chain_id, token0 = _a.token0, token1 = _a.token1, token0_is_base_asset = _a.token0_is_base_asset;
                    v2abi = abis.uni_v2;
                    this.routerContract = new ethers_1.ethers.Contract(router_address, v2abi.router, this.wallet);
                    this.poolContract = new ethers_1.ethers.Contract(pool_address, v2abi.pool, this.wallet);
                    if (token0) {
                        contract_address = token0.contract_address, decimals = token0.decimals, symbol = token0.symbol, name_1 = token0.name;
                        this.token0 = new UNISWAP.Token(chain_id, contract_address, decimals, symbol, name_1);
                        this.token0Contract = new ethers_1.ethers.Contract(contract_address, abis.erc20, this.wallet);
                    }
                    else {
                        this.token0 = null;
                        this.token0Contract = null;
                    }
                    if (token1) {
                        contract_address = token1.contract_address, decimals = token1.decimals, symbol = token1.symbol, name_2 = token1.name;
                        this.token1 = new UNISWAP.Token(chain_id, contract_address, decimals, symbol, name_2);
                        this.token1Contract = new ethers_1.ethers.Contract(contract_address, abis.erc20, this.wallet);
                    }
                    else {
                        this.token1 = null;
                        this.token1Contract = null;
                    }
                    this.tokens = {
                        base_token: (token0_is_base_asset ? this.token0 : this.token1),
                        quote_token: (token0_is_base_asset ? this.token1 : this.token0),
                        base_token_contract: (token0_is_base_asset ? this.token0Contract : this.token1Contract),
                        quote_token_contract: (token0_is_base_asset ? this.token1Contract : this.token0Contract),
                        base_token_decimals: (token0_is_base_asset ? this.token0.decimals : this.token1.decimals),
                        quote_token_decimals: (token0_is_base_asset ? this.token1.decimals : this.token0.decimals),
                    };
                    this.log("Initialization complete");
                    return [2];
                });
            });
        };
        UniV2Balancer.prototype.get_base_balance = function (ba) {
            return __awaiter(this, void 0, void 0, function () {
                var tokens, base_token, quote_token, tmp, decimals;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            tokens = this.tokens;
                            base_token = tokens.base_token;
                            quote_token = tokens.quote_token;
                            return [4, tokens.base_token_contract.balanceOf(this.wallet.address)];
                        case 1:
                            tmp = (_a.sent());
                            decimals = base_token.decimals;
                            return [2, Number(ethers_1.ethers.utils.formatUnits(tmp.toString(), decimals))];
                    }
                });
            });
        };
        UniV2Balancer.prototype.get_quote_balance = function (qa) {
            return __awaiter(this, void 0, void 0, function () {
                var tokens, base_token, quote_token, tmp, decimals;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            tokens = this.tokens;
                            base_token = tokens.base_token;
                            quote_token = tokens.quote_token;
                            return [4, tokens.quote_token_contract.balanceOf(this.wallet.address)];
                        case 1:
                            tmp = (_a.sent());
                            decimals = quote_token.decimals;
                            return [2, Number(ethers_1.ethers.utils.formatUnits(tmp.toString(), decimals))];
                    }
                });
            });
        };
        UniV2Balancer.prototype.get_base_price = function (ba, qa) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, base_reserves, quote_reserves;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4, this.get_pool_reserves()];
                        case 1:
                            _a = _b.sent(), base_reserves = _a.base_reserves, quote_reserves = _a.quote_reserves;
                            return [2, quote_reserves / base_reserves];
                    }
                });
            });
        };
        UniV2Balancer.prototype.generate_swap_transaction = function (base_or_quote, amt) {
            return __awaiter(this, void 0, void 0, function () {
                var output_info, _amt, tokens, base_token, quote_token, amounts, amountOutNoSlip, amountIn, amountOut, slippageRatio, slippagePercent, path, max_slippage_percent, minAmountOutNum, minAmountOut, overrides, gas_estimate, tx;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.log("Generating transaction that will consume ".concat(amt, " ").concat(base_or_quote, " tokens"));
                            tokens = this.tokens;
                            base_token = tokens.base_token;
                            quote_token = tokens.quote_token;
                            if (!(base_or_quote == "BASE")) return [3, 2];
                            _amt = Number(amt.toFixed(base_token.decimals));
                            this.log("Converted ".concat(amt, " to ").concat(_amt, " for base input"));
                            return [4, this.estimate_quote_out(_amt)];
                        case 1:
                            output_info = _a.sent();
                            return [3, 4];
                        case 2:
                            _amt = Number(amt.toFixed(quote_token.decimals));
                            this.log("Converted ".concat(amt, " to ").concat(_amt, " for quote input"));
                            return [4, this.estimate_base_out(_amt)];
                        case 3:
                            output_info = _a.sent();
                            _a.label = 4;
                        case 4:
                            amounts = output_info.amounts, amountOutNoSlip = output_info.amountOutNoSlip, amountIn = output_info.amountIn, amountOut = output_info.amountOut, slippageRatio = output_info.slippageRatio, slippagePercent = output_info.slippagePercent, path = output_info.path, max_slippage_percent = output_info.max_slippage_percent, minAmountOutNum = output_info.minAmountOutNum, minAmountOut = output_info.minAmountOut;
                            this.log(output_info);
                            return [4, this.wallet.get_gas_overrides()];
                        case 5:
                            overrides = _a.sent();
                            overrides.gasLimit = ethers_1.ethers.BigNumber.from("200000");
                            this.log("Estimating gas");
                            return [4, this.routerContract
                                    .estimateGas
                                    .swapExactTokensForTokens(amountIn, minAmountOut, path, this.wallet.address, (Date.now() + 1000 * 60 * 10), overrides)];
                        case 6:
                            gas_estimate = _a.sent();
                            this.log("Gas estimate=");
                            this.log(gas_estimate);
                            overrides.gasLimit = gas_estimate;
                            return [4, this.routerContract
                                    .populateTransaction
                                    .swapExactTokensForTokens(amountIn, minAmountOut, path, this.wallet.address, (Date.now() + 1000 * 60 * 10), overrides)];
                        case 7:
                            tx = _a.sent();
                            return [2, { tx: tx, output_info: output_info, gas_estimate: gas_estimate }];
                    }
                });
            });
        };
        UniV2Balancer.prototype.do_swap = function (base_or_quote, amt, base_smart_send_ops) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, tx, output_info, slippagePercent, max_slippage_percent, ops;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4, this.generate_swap_transaction(base_or_quote, amt)];
                        case 1:
                            _a = _b.sent(), tx = _a.tx, output_info = _a.output_info;
                            slippagePercent = output_info.slippagePercent, max_slippage_percent = output_info.max_slippage_percent;
                            if (!(slippagePercent > max_slippage_percent)) return [3, 2];
                            this.log("Aborting swap due to high slippage");
                            this.log(output_info);
                            return [2, { success: false }];
                        case 2:
                            this.log("Proceeding with swap");
                            ops = Object.assign({ tx: tx }, base_smart_send_ops);
                            return [4, this.wallet.smartSendTransaction(ops)];
                        case 3: return [2, (_b.sent())];
                    }
                });
            });
        };
        UniV2Balancer.prototype.base_token_approved = function () {
            return __awaiter(this, void 0, void 0, function () {
                var tokens, token_contract, router_address;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            tokens = this.tokens;
                            token_contract = tokens.base_token_contract;
                            router_address = this.routerContract.address;
                            return [4, this.wallet.token_allowance_is_maxed(token_contract, router_address)];
                        case 1: return [2, (_a.sent())];
                    }
                });
            });
        };
        UniV2Balancer.prototype.quote_token_approved = function () {
            return __awaiter(this, void 0, void 0, function () {
                var tokens, token_contract, router_address;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            tokens = this.tokens;
                            token_contract = tokens.quote_token_contract;
                            router_address = this.routerContract.address;
                            return [4, this.wallet.token_allowance_is_maxed(token_contract, router_address)];
                        case 1: return [2, (_a.sent())];
                    }
                });
            });
        };
        UniV2Balancer.prototype.approve_token = function (token_contract, base_smart_send_ops) {
            return __awaiter(this, void 0, void 0, function () {
                var router_address, ops;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            router_address = this.routerContract.address;
                            ops = {
                                token_contract: token_contract,
                                allowee_addr: router_address,
                                base_smart_send_ops: base_smart_send_ops
                            };
                            return [4, this.wallet.fully_approve_token(ops)];
                        case 1: return [2, (_a.sent())];
                    }
                });
            });
        };
        UniV2Balancer.prototype.approve_quote_token = function (base_smart_send_ops) {
            return __awaiter(this, void 0, void 0, function () {
                var tokens, token_contract;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            tokens = this.tokens;
                            token_contract = tokens.quote_token_contract;
                            return [4, this.approve_token(token_contract, base_smart_send_ops)];
                        case 1: return [2, (_a.sent())];
                    }
                });
            });
        };
        UniV2Balancer.prototype.approve_base_token = function (base_smart_send_ops) {
            return __awaiter(this, void 0, void 0, function () {
                var tokens, token_contract;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            tokens = this.tokens;
                            token_contract = tokens.base_token_contract;
                            return [4, this.approve_token(token_contract, base_smart_send_ops)];
                        case 1: return [2, (_a.sent())];
                    }
                });
            });
        };
        UniV2Balancer.prototype.prepare_tokens = function (base_smart_send_ops) {
            return __awaiter(this, void 0, void 0, function () {
                var base_result, quote_result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.log("Checking tokens");
                            if (!base_smart_send_ops) {
                                this.log("No gas args provided!");
                                return [2, null];
                            }
                            return [4, this.base_token_approved()];
                        case 1:
                            if (!!(_a.sent())) return [3, 3];
                            this.log("Base token not approved...");
                            return [4, this.approve_base_token(base_smart_send_ops)];
                        case 2:
                            base_result = _a.sent();
                            return [3, 4];
                        case 3:
                            this.log("Base token already approved...");
                            base_result = { status: smart_wallet_1.TxStatus.Success };
                            _a.label = 4;
                        case 4: return [4, this.quote_token_approved()];
                        case 5:
                            if (!!(_a.sent())) return [3, 7];
                            this.log("Quote token not approved...");
                            return [4, this.approve_quote_token(base_smart_send_ops)];
                        case 6:
                            quote_result = _a.sent();
                            return [3, 8];
                        case 7:
                            this.log("Quote token already approved...");
                            quote_result = { status: smart_wallet_1.TxStatus.Success };
                            _a.label = 8;
                        case 8:
                            if ((base_result.status == smart_wallet_1.TxStatus.Success) &&
                                (quote_result.status == smart_wallet_1.TxStatus.Success)) {
                                this.log("Both token approvals succeeded!");
                                return [2, { success: true }];
                            }
                            else {
                                this.log("Unfortunately there was an error with the token approvals");
                                return [2, { success: false, data: { base_result: base_result, quote_result: quote_result } }];
                            }
                            return [2];
                    }
                });
            });
        };
        UniV2Balancer.prototype.get_base_tx_ops = function () {
            return __awaiter(this, void 0, void 0, function () {
                var wallet, addr, overrides, _a, base_token, quote_token, base_token_contract, quote_token_contract;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            wallet = this.wallet;
                            addr = wallet.address;
                            return [4, this.wallet.get_gas_overrides()];
                        case 1:
                            overrides = _b.sent();
                            _a = this.tokens, base_token = _a.base_token, quote_token = _a.quote_token, base_token_contract = _a.base_token_contract, quote_token_contract = _a.quote_token_contract;
                            return [2, {
                                    wallet: wallet,
                                    addr: addr,
                                    from: addr,
                                    overrides: overrides,
                                    base_token: base_token,
                                    quote_token: quote_token,
                                    base_token_contract: base_token_contract,
                                    quote_token_contract: quote_token_contract,
                                    router_contract: this.routerContract,
                                }];
                    }
                });
            });
        };
        UniV2Balancer.prototype.get_tx_gas_info = function (tx, usd_price) {
            var gasPrice = tx.gasPrice, gasLimit = tx.gasLimit;
            var max_total_gas = Number(ethers_1.ethers.utils.formatEther(gasPrice.mul(gasLimit)));
            var l1_price_usd = usd_price;
            var max_total_gas_usd = max_total_gas * l1_price_usd;
            return {
                max_total_gas: max_total_gas,
                max_total_gas_usd: max_total_gas_usd,
                l1_price_usd: l1_price_usd,
                gasPrice: gasPrice,
                gasLimit: gasLimit,
            };
        };
        UniV2Balancer.prototype.estimate_quote_out = function (amt) {
            return __awaiter(this, void 0, void 0, function () {
                var tokens, base_token, quote_token, _a, base_amt, quote_amt, base_price, portfolio_value, current_ratio, ratio_error, target_achieved, target_base_amt, base_delta, trade_type, base_market_amt, amountIn, path, amountOutNoSlip, amounts, amountOut, slippageRatio, slippagePercent, max_slippage_percent, minAmountOutNum, minAmountOut;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            tokens = this.tokens;
                            base_token = tokens.base_token;
                            quote_token = tokens.quote_token;
                            return [4, this.get_balance_data()];
                        case 1:
                            _a = (_b.sent()), base_amt = _a.base_amt, quote_amt = _a.quote_amt, base_price = _a.base_price, portfolio_value = _a.portfolio_value, current_ratio = _a.current_ratio, ratio_error = _a.ratio_error, target_achieved = _a.target_achieved, target_base_amt = _a.target_base_amt, base_delta = _a.base_delta, trade_type = _a.trade_type, base_market_amt = _a.base_market_amt;
                            amountIn = ethers_1.ethers.utils.parseUnits(String(amt), base_token.decimals);
                            path = [base_token.address, quote_token.address];
                            amountOutNoSlip = amt * base_price;
                            return [4, this.routerContract.getAmountsOut(amountIn, path)];
                        case 2:
                            amounts = _b.sent();
                            amountOut = Number(ethers_1.ethers.utils.formatUnits(amounts[1], quote_token.decimals));
                            slippageRatio = (amountOutNoSlip - amountOut) / amountOutNoSlip;
                            slippagePercent = slippageRatio * 100;
                            max_slippage_percent = this.params.max_slippage_percent;
                            minAmountOutNum = (amountOutNoSlip * (1 - max_slippage_percent / 100)).toFixed(quote_token.decimals);
                            minAmountOut = ethers_1.ethers.utils.parseUnits(String(minAmountOutNum), quote_token.decimals);
                            return [2, {
                                    amounts: amounts,
                                    amountOutNoSlip: amountOutNoSlip,
                                    amountIn: amountIn,
                                    amountOut: amountOut,
                                    slippageRatio: slippageRatio,
                                    slippagePercent: slippagePercent,
                                    max_slippage_percent: max_slippage_percent,
                                    minAmountOutNum: minAmountOutNum,
                                    minAmountOut: minAmountOut,
                                    path: path
                                }];
                    }
                });
            });
        };
        UniV2Balancer.prototype.estimate_base_out = function (amt) {
            return __awaiter(this, void 0, void 0, function () {
                var tokens, base_token, quote_token, _a, base_amt, quote_amt, base_price, portfolio_value, current_ratio, ratio_error, target_achieved, target_base_amt, base_delta, trade_type, base_market_amt, amountIn, path, amountOutNoSlip, amounts, amountOut, slippageRatio, slippagePercent, max_slippage_percent, minAmountOutNum, minAmountOut;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            tokens = this.tokens;
                            base_token = tokens.base_token;
                            quote_token = tokens.quote_token;
                            return [4, this.get_balance_data()];
                        case 1:
                            _a = (_b.sent()), base_amt = _a.base_amt, quote_amt = _a.quote_amt, base_price = _a.base_price, portfolio_value = _a.portfolio_value, current_ratio = _a.current_ratio, ratio_error = _a.ratio_error, target_achieved = _a.target_achieved, target_base_amt = _a.target_base_amt, base_delta = _a.base_delta, trade_type = _a.trade_type, base_market_amt = _a.base_market_amt;
                            amountIn = ethers_1.ethers.utils.parseUnits(String(amt), quote_token.decimals);
                            path = [quote_token.address, base_token.address];
                            amountOutNoSlip = amt / base_price;
                            return [4, this.routerContract.getAmountsOut(amountIn, path)];
                        case 2:
                            amounts = _b.sent();
                            amountOut = Number(ethers_1.ethers.utils.formatUnits(amounts[1], base_token.decimals));
                            slippageRatio = (amountOutNoSlip - amountOut) / amountOutNoSlip;
                            slippagePercent = slippageRatio * 100;
                            max_slippage_percent = this.params.max_slippage_percent;
                            minAmountOutNum = (amountOutNoSlip * (1 - max_slippage_percent / 100)).toFixed(base_token.decimals);
                            minAmountOut = ethers_1.ethers.utils.parseUnits(String(minAmountOutNum), base_token.decimals);
                            return [2, {
                                    amounts: amounts,
                                    amountOutNoSlip: amountOutNoSlip,
                                    amountIn: amountIn,
                                    amountOut: amountOut,
                                    slippageRatio: slippageRatio,
                                    slippagePercent: slippagePercent,
                                    max_slippage_percent: max_slippage_percent,
                                    minAmountOutNum: minAmountOutNum,
                                    minAmountOut: minAmountOut,
                                    path: path
                                }];
                    }
                });
            });
        };
        UniV2Balancer.prototype.get_pool_reserves = function () {
            return __awaiter(this, void 0, void 0, function () {
                var tokens, tmp, token0reserves, token1reserves, base_reserves, quote_reserves;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            tokens = this.tokens;
                            return [4, this.poolContract.getReserves()];
                        case 1:
                            tmp = _a.sent();
                            token0reserves = (0, utils_1.toEth)(tmp[0], this.token0.decimals);
                            token1reserves = (0, utils_1.toEth)(tmp[1], this.token1.decimals);
                            base_reserves = (this.params.token0_is_base_asset ? token0reserves : token1reserves);
                            quote_reserves = (this.params.token0_is_base_asset ? token1reserves : token0reserves);
                            return [2, {
                                    token0reserves: token0reserves,
                                    token1reserves: token1reserves,
                                    base_reserves: base_reserves,
                                    quote_reserves: quote_reserves,
                                }];
                    }
                });
            });
        };
        UniV2Balancer.prototype.do_market_trade = function (trade_type, base_amt) {
            return __awaiter(this, void 0, void 0, function () {
                var result, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = trade_type;
                            switch (_a) {
                                case pbl.MarketTradeType.BUY: return [3, 1];
                                case pbl.MarketTradeType.SELL: return [3, 3];
                            }
                            return [3, 5];
                        case 1: return [4, this.do_swap("QUOTE", base_amt, this.wallet.default_smart_send_base(0.05))];
                        case 2:
                            result = _b.sent();
                            return [3, 5];
                        case 3: return [4, this.do_swap("BASE", base_amt, this.wallet.default_smart_send_base(0.05))];
                        case 4:
                            result = _b.sent();
                            return [3, 5];
                        case 5:
                            if (result.status == smart_wallet_1.TxStatus.Success) {
                                return [2, { error: false, info: result }];
                            }
                            else {
                                return [2, { error: true, info: result }];
                            }
                            return [2];
                    }
                });
            });
        };
        UniV2Balancer.prototype.symbol_generator = function (ba, qa) {
            return "".concat(ba, "/").concat(qa);
        };
        return UniV2Balancer;
    }(EVMBalancer));
    exports.UniV2Balancer = UniV2Balancer;
});
