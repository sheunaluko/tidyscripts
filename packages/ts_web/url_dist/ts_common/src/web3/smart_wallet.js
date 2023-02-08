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
        define(["require", "exports", "ethers", "../logger", "../async", "ramda"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.polygon_provider = exports.arbitrum_provider = exports.ethereum_provider = exports.fantom_provider = exports.get_provider = exports.ProviderType = exports.SmartWallet = exports.TxType = exports.TxStatus = exports.scale_big_num = exports.MaxGasType = void 0;
    var ethers_1 = require("ethers");
    var logger_1 = require("../logger");
    var asnc = require("../async");
    var R = require("ramda");
    var _a = ethers_1.ethers.utils, formatEther = _a.formatEther, parseEther = _a.parseEther, formatUnits = _a.formatUnits, parseUnits = _a.parseUnits;
    var maxNumAsString = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
    var maxBigNum = ethers_1.ethers.BigNumber.from(maxNumAsString);
    var MaxGasType;
    (function (MaxGasType) {
        MaxGasType[MaxGasType["GasPrice"] = 0] = "GasPrice";
        MaxGasType[MaxGasType["TxFee"] = 1] = "TxFee";
    })(MaxGasType = exports.MaxGasType || (exports.MaxGasType = {}));
    function scale_big_num(n, ratio) {
        var x_num = Math.ceil(ratio * Number(n.toString()));
        return ethers_1.ethers.BigNumber.from(String(x_num));
    }
    exports.scale_big_num = scale_big_num;
    var TxStatus;
    (function (TxStatus) {
        TxStatus[TxStatus["Error"] = 0] = "Error";
        TxStatus[TxStatus["MaxRetriesReached"] = 1] = "MaxRetriesReached";
        TxStatus[TxStatus["MaxGasReached"] = 2] = "MaxGasReached";
        TxStatus[TxStatus["GasVerified"] = 3] = "GasVerified";
        TxStatus[TxStatus["Success"] = 4] = "Success";
    })(TxStatus = exports.TxStatus || (exports.TxStatus = {}));
    var TxType;
    (function (TxType) {
        TxType[TxType["EIP_1559"] = 0] = "EIP_1559";
        TxType[TxType["LEGACY"] = 1] = "LEGACY";
    })(TxType = exports.TxType || (exports.TxType = {}));
    var SmartWallet = (function (_super) {
        __extends(SmartWallet, _super);
        function SmartWallet(ops) {
            var _this = this;
            var privateKey = ops.privateKey, provider = ops.provider, tx_type = ops.tx_type;
            _this = _super.call(this, privateKey, provider) || this;
            _this.params = ops;
            return _this;
        }
        SmartWallet.prototype.init = function () {
            return __awaiter(this, void 0, void 0, function () {
                var chainId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4, this.params.provider.ready];
                        case 1:
                            chainId = (_a.sent()).chainId;
                            this.id = "".concat(this.address.slice(1, 6), "@").concat(chainId);
                            this.log = (0, logger_1.get_logger)({ id: this.id });
                            return [2];
                    }
                });
            });
        };
        SmartWallet.prototype.get_fee_data = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4, this.provider.getFeeData()];
                        case 1: return [2, _a.sent()];
                    }
                });
            });
        };
        SmartWallet.prototype.wrap_transactions_with_gas = function (txs) {
            return __awaiter(this, void 0, void 0, function () {
                var fee_data, maxFeePerGas, maxPriorityFeePerGas, gasPrice;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4, this.get_fee_data()];
                        case 1:
                            fee_data = _a.sent();
                            maxFeePerGas = fee_data.maxFeePerGas, maxPriorityFeePerGas = fee_data.maxPriorityFeePerGas, gasPrice = fee_data.gasPrice;
                            switch (this.params.tx_type) {
                                case TxType.EIP_1559:
                                    txs.map(function (tx) { return Object.assign(tx, { maxFeePerGas: maxFeePerGas }); });
                                    return [2, txs];
                                    break;
                                case TxType.LEGACY:
                                    txs.map(function (tx) { return Object.assign(tx, { gasPrice: gasPrice }); });
                                    return [2, txs];
                                    break;
                            }
                            return [2];
                    }
                });
            });
        };
        SmartWallet.prototype.get_gas_overrides = function () {
            return __awaiter(this, void 0, void 0, function () {
                var tx;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            tx = {};
                            return [4, this.wrap_transactions_with_gas([tx])];
                        case 1: return [2, (_a.sent())[0]];
                    }
                });
            });
        };
        SmartWallet.prototype.multiply_transactions_gas_pricing = function (txs, multiplier) {
            var scaler = (function (x) { return scale_big_num(x, multiplier); });
            switch (this.params.tx_type) {
                case TxType.EIP_1559:
                    return txs.map(R.modifyPath(['maxFeePerGas'], scaler));
                case TxType.LEGACY:
                    return txs.map(R.modifyPath(['gasPrice'], scaler));
            }
        };
        SmartWallet.prototype.smart_eth_transfer = function (ops) {
            return __awaiter(this, void 0, void 0, function () {
                var to, amt, max_gas_ops, max_retries, timeout_ms, default_gas_ops, tx, smart_ops;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            to = ops.to, amt = ops.amt, max_gas_ops = ops.max_gas_ops, max_retries = ops.max_retries, timeout_ms = ops.timeout_ms;
                            default_gas_ops = { type: MaxGasType.TxFee,
                                value: parseEther("0.0001") };
                            max_gas_ops = (max_gas_ops || default_gas_ops);
                            max_retries = (max_retries || 5);
                            timeout_ms = (timeout_ms || 1000 * 30);
                            return [4, this.generate_l1_transfer_tx(to, amt)];
                        case 1:
                            tx = _a.sent();
                            smart_ops = {
                                tx: tx,
                                max_gas_ops: max_gas_ops,
                                max_retries: max_retries,
                                timeout_ms: timeout_ms
                            };
                            return [4, this.smartSendTransaction(smart_ops)];
                        case 2: return [2, (_a.sent())];
                    }
                });
            });
        };
        SmartWallet.prototype.generate_l1_transfer_tx = function (to, amt) {
            return __awaiter(this, void 0, void 0, function () {
                var tx;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            tx = {
                                from: this.address,
                                to: to,
                                value: ethers_1.ethers.utils.parseEther(amt),
                                gasLimit: ethers_1.ethers.BigNumber.from("25000"),
                            };
                            return [4, this.wrap_transactions_with_gas([tx])];
                        case 1: return [2, (_a.sent())[0]];
                    }
                });
            });
        };
        SmartWallet.prototype.get_token_allowance = function (token_contract, allowee_addr) {
            return __awaiter(this, void 0, void 0, function () {
                var allowance;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4, token_contract.allowance(this.address, allowee_addr)];
                        case 1:
                            allowance = _a.sent();
                            return [2, allowance];
                    }
                });
            });
        };
        SmartWallet.prototype.token_allowance_is_maxed = function (token_contract, allowee_addr) {
            return __awaiter(this, void 0, void 0, function () {
                var allowance;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4, this.get_token_allowance(token_contract, allowee_addr)];
                        case 1:
                            allowance = _a.sent();
                            return [2, (allowance.eq(maxBigNum))];
                    }
                });
            });
        };
        SmartWallet.prototype.generate_approve_token_tx = function (token_contract, allowee_addr) {
            return __awaiter(this, void 0, void 0, function () {
                var overrides, gas_estimate, tx;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4, this.get_gas_overrides()];
                        case 1:
                            overrides = _a.sent();
                            overrides.gasLimit = ethers_1.ethers.utils.parseUnits("100000", 'gwei');
                            return [4, token_contract.estimateGas.approve(allowee_addr, maxBigNum, overrides)];
                        case 2:
                            gas_estimate = _a.sent();
                            overrides.gasLimit = gas_estimate;
                            return [4, token_contract.populateTransaction.approve(allowee_addr, maxBigNum, overrides)];
                        case 3:
                            tx = _a.sent();
                            return [2, tx];
                    }
                });
            });
        };
        SmartWallet.prototype.fully_approve_token = function (ops) {
            return __awaiter(this, void 0, void 0, function () {
                var token_contract, allowee_addr, base_smart_send_ops, tx, smart_ops;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            token_contract = ops.token_contract, allowee_addr = ops.allowee_addr, base_smart_send_ops = ops.base_smart_send_ops;
                            return [4, this.generate_approve_token_tx(token_contract, allowee_addr)];
                        case 1:
                            tx = _a.sent();
                            smart_ops = Object.assign({ tx: tx }, base_smart_send_ops);
                            return [4, this.smartSendTransaction(smart_ops)];
                        case 2: return [2, (_a.sent())];
                    }
                });
            });
        };
        SmartWallet.prototype.max_fee_ops = function (value) {
            return {
                type: MaxGasType.TxFee,
                value: value
            };
        };
        SmartWallet.prototype.max_price_ops = function (value) {
            return {
                type: MaxGasType.GasPrice,
                value: value
            };
        };
        SmartWallet.prototype.default_smart_send_base = function (ethFee) {
            var max_gas_ops = this.max_fee_ops(ethers_1.ethers.utils.parseEther(String(ethFee)));
            var max_retries = 4;
            var timeout_ms = 45 * 1000;
            return {
                max_gas_ops: max_gas_ops,
                max_retries: max_retries,
                timeout_ms: timeout_ms
            };
        };
        SmartWallet.prototype.smartSendTransaction = function (ops) {
            return __awaiter(this, void 0, void 0, function () {
                var tx, max_gas_ops, max_retries, timeout_ms, nonce, tx_log, tx_attempts, tx_receipts, overrides, i, info, tx_gas_info, status_1, details, tx_response, tx_receipt, receipts_promise, x, multiplier, _a, _b, _c, e_1;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            tx = ops.tx, max_gas_ops = ops.max_gas_ops, max_retries = ops.max_retries, timeout_ms = ops.timeout_ms;
                            return [4, this.getTransactionCount()];
                        case 1:
                            nonce = _d.sent();
                            tx_log = (0, logger_1.get_logger)({ id: "".concat(this.id, ":").concat(nonce) });
                            tx_attempts = [];
                            tx_receipts = [];
                            tx_log("Processing SmartSend Tx Request::");
                            tx_log("Nonce is ".concat(nonce));
                            tx_log(tx);
                            return [4, this.get_gas_overrides()];
                        case 2:
                            overrides = _d.sent();
                            overrides.nonce = nonce;
                            i = 0;
                            _d.label = 3;
                        case 3:
                            if (!(i < max_retries)) return [3, 13];
                            tx_log("Attempt number: ".concat(i + 1));
                            tx_log('overrides:');
                            tx_log(overrides);
                            Object.assign(tx, overrides);
                            tx_log('tx:');
                            tx_log(tx);
                            _d.label = 4;
                        case 4:
                            _d.trys.push([4, 11, , 12]);
                            return [4, this.check_transaction_gas(tx, max_gas_ops)];
                        case 5:
                            info = _d.sent();
                            tx_gas_info = info.tx_gas_info, status_1 = info.status, details = info.details;
                            if (status_1 != TxStatus.GasVerified) {
                                tx_log("Tx gas failed verification... aborting");
                                return [2, {
                                        status: status_1,
                                        tx_gas_info: tx_gas_info,
                                        tx_attempts: tx_attempts,
                                        details: details,
                                        ops: ops
                                    }];
                            }
                            else {
                                tx_log("Tx gas check passed... will send following tx: (see gas info after tx)");
                                tx_log(tx);
                                tx_log(tx_gas_info);
                            }
                            return [4, this.sendTransaction(tx)];
                        case 6:
                            tx_response = _d.sent();
                            tx_receipt = tx_response.wait();
                            tx_attempts.push([tx_response, tx_receipt]);
                            tx_receipts.push(tx_receipt);
                            receipts_promise = Promise.any(tx_receipts);
                            return [4, Promise.race([receipts_promise, asnc.wait(timeout_ms)])];
                        case 7:
                            x = _d.sent();
                            if (!(x == asnc.status.TIMEOUT)) return [3, 9];
                            tx_log("Timeout occurred.. tx not yet mined or errored");
                            tx_log("Modifying gas params...");
                            multiplier = (1 + (i + 1) * 0.1);
                            tx_log("Multiplier=" + multiplier);
                            _b = (_a = Object).assign;
                            _c = [overrides];
                            return [4, this.get_gas_overrides()];
                        case 8:
                            _b.apply(_a, _c.concat([_d.sent()]));
                            tx_log("Got gas estimation:");
                            tx_log(overrides);
                            Object.assign(tx, overrides);
                            tx_log("Looping");
                            return [3, 10];
                        case 9:
                            tx_log("Transaction mined successfully!");
                            return [2, {
                                    status: TxStatus.Success,
                                    receipt: x,
                                    tx_attempts: tx_attempts,
                                    ops: ops,
                                }];
                        case 10: return [3, 12];
                        case 11:
                            e_1 = _d.sent();
                            tx_log("Error occurred :(");
                            tx_log(e_1);
                            return [2, {
                                    status: TxStatus.Error,
                                    details: e_1,
                                    tx_attempts: tx_attempts,
                                    ops: ops,
                                }];
                        case 12:
                            i++;
                            return [3, 3];
                        case 13: return [2, {
                                status: TxStatus.MaxRetriesReached,
                                tx_attempts: tx_attempts,
                                ops: ops,
                            }];
                    }
                });
            });
        };
        SmartWallet.prototype.get_gas_price_field = function () {
            switch (this.params.tx_type) {
                case TxType.EIP_1559:
                    return 'maxFeePerGas';
                case TxType.LEGACY:
                    return 'gasPrice';
            }
        };
        SmartWallet.prototype.calculate_transaction_gas = function (tx) {
            var maxGasPrice = tx[this.get_gas_price_field()];
            var gasLimit = tx.gasLimit;
            var maxTxFee = maxGasPrice.mul(gasLimit);
            return {
                maxGasPrice: maxGasPrice,
                gasLimit: gasLimit,
                maxTxFee: maxTxFee
            };
        };
        SmartWallet.prototype.check_transaction_gas = function (tx, gas_ops) {
            var tx_gas_info = this.calculate_transaction_gas(tx);
            var maxGasPrice = tx_gas_info.maxGasPrice, gasLimit = tx_gas_info.gasLimit, maxTxFee = tx_gas_info.maxTxFee;
            var status;
            var details;
            switch (gas_ops.type) {
                case MaxGasType.TxFee:
                    this.log("0");
                    if (maxTxFee.gt(gas_ops.value)) {
                        status = TxStatus.MaxGasReached;
                        details = "MaxFee of ".concat(formatEther(gas_ops.value), " was exceeded by planned fee of ").concat(formatEther(maxTxFee));
                    }
                    else {
                        status = TxStatus.GasVerified;
                        details = "MaxFee of ".concat(formatEther(gas_ops.value), " was verified by planned fee of ").concat(formatEther(maxTxFee));
                    }
                    break;
                case MaxGasType.GasPrice:
                    if (maxGasPrice.gt(gas_ops.value)) {
                        status = TxStatus.MaxGasReached;
                        details = "MaxGasPrice of ".concat(formatUnits(gas_ops.value, 'gwei'), " (gwei) was exceeded by planned price of ").concat(formatUnits(maxGasPrice, 'gwei'), " (gwei)");
                    }
                    else {
                        status = TxStatus.GasVerified;
                        details = "MaxGasPrice of ".concat(formatUnits(gas_ops.value, 'gwei'), " (gwei) was verified by planned price of ").concat(formatUnits(maxGasPrice, 'gwei'), " (gwei)");
                    }
                    break;
                default:
                    status = TxStatus.Error;
                    details = "Unkown MaxGasType";
                    break;
            }
            var to_ret = {
                tx_gas_info: tx_gas_info,
                status: status,
                details: details,
            };
            this.log(details);
            return to_ret;
        };
        SmartWallet.prototype.balanceAsNumber = function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = Number;
                            _b = formatEther;
                            return [4, this.getBalance()];
                        case 1: return [2, _a.apply(void 0, [_b.apply(void 0, [_c.sent()])])];
                    }
                });
            });
        };
        return SmartWallet;
    }(ethers_1.ethers.Wallet));
    exports.SmartWallet = SmartWallet;
    var ProviderType;
    (function (ProviderType) {
        ProviderType[ProviderType["Ethereum"] = 0] = "Ethereum";
        ProviderType[ProviderType["Fantom"] = 1] = "Fantom";
        ProviderType[ProviderType["Arbitrum"] = 2] = "Arbitrum";
        ProviderType[ProviderType["Polygon"] = 3] = "Polygon";
    })(ProviderType = exports.ProviderType || (exports.ProviderType = {}));
    function get_provider(p) {
        switch (p) {
            case ProviderType.Ethereum:
                return new ethers_1.ethers.providers.InfuraProvider('mainnet', process.env['ETHER_INFURA_PROJECT_ID']);
                break;
            case ProviderType.Fantom:
                return new ethers_1.ethers.providers.JsonRpcProvider("https://rpcapi.fantom.network/");
                break;
            case ProviderType.Arbitrum:
                return new ethers_1.ethers.providers.InfuraProvider('mainnet', process.env['ARBITRUM_INFURA_PROJECT_ID']);
                break;
            case ProviderType.Polygon:
                return new ethers_1.ethers.providers.JsonRpcProvider('https://polygon-rpc.com');
                break;
        }
    }
    exports.get_provider = get_provider;
    function fantom_provider() { return get_provider(ProviderType.Fantom); }
    exports.fantom_provider = fantom_provider;
    function ethereum_provider() { return get_provider(ProviderType.Ethereum); }
    exports.ethereum_provider = ethereum_provider;
    function arbitrum_provider() { return get_provider(ProviderType.Arbitrum); }
    exports.arbitrum_provider = arbitrum_provider;
    function polygon_provider() { return get_provider(ProviderType.Polygon); }
    exports.polygon_provider = polygon_provider;
});
