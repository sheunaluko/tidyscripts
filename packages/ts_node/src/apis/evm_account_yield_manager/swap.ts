/**
 * EVM Account Yield Manager - Swap Service
 *
 * Token swap functionality via DEX aggregators (1inch, Paraswap, etc.)
 */

import {
    SupportedChain,
    SwapQuote,
    SwapParams,
    SwapResult,
    TokenInfo,
    EVMManagerConfig,
    EVMManagerError,
    PortfolioAllocation,
    RebalanceStrategy,
    RebalanceSwap,
    RebalanceResult,
} from './types';
import {
    CHAIN_CONFIGS,
    getChainConfig,
    isNativeToken,
    getWrappedNativeToken,
} from './chains';
import { BalanceService, getBalanceService } from './balances';

// ============================================================================
// DEX Aggregator Interfaces
// ============================================================================

interface OneInchQuoteResponse {
    fromToken: {
        symbol: string;
        name: string;
        address: string;
        decimals: number;
    };
    toToken: {
        symbol: string;
        name: string;
        address: string;
        decimals: number;
    };
    toAmount: string;
    estimatedGas: number;
    protocols: any[];
}

interface OneInchSwapResponse extends OneInchQuoteResponse {
    tx: {
        from: string;
        to: string;
        data: string;
        value: string;
        gas: number;
        gasPrice: string;
    };
}

interface ParaswapPriceResponse {
    priceRoute: {
        srcToken: string;
        srcDecimals: number;
        destToken: string;
        destDecimals: number;
        destAmount: string;
        gasCost: string;
        bestRoute: any[];
    };
}

// ============================================================================
// Swap Service
// ============================================================================

export class SwapService {
    private config: EVMManagerConfig;
    private balanceService: BalanceService;

    constructor(config: EVMManagerConfig) {
        this.config = config;
        this.balanceService = getBalanceService(config);
    }

    /**
     * Get chain ID mapping for 1inch API
     */
    private getOneInchChainId(chain: SupportedChain): number {
        return CHAIN_CONFIGS[chain].chainId;
    }

    /**
     * Get swap quote from 1inch
     */
    async getQuoteOneInch(params: SwapParams): Promise<SwapQuote> {
        const chainId = this.getOneInchChainId(params.chain);
        const chainConfig = getChainConfig(params.chain);

        const fromToken = isNativeToken(params.fromTokenAddress)
            ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
            : params.fromTokenAddress;
        const toToken = isNativeToken(params.toTokenAddress)
            ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
            : params.toTokenAddress;

        const apiKey = this.config.apiKeys?.oneInch;
        if (!apiKey) {
            throw new EVMManagerError(
                '1inch API key required',
                'API_KEY_MISSING'
            );
        }

        const url = new URL(
            `https://api.1inch.dev/swap/v6.0/${chainId}/quote`
        );
        url.searchParams.set('src', fromToken);
        url.searchParams.set('dst', toToken);
        url.searchParams.set('amount', params.amount);

        const response = await fetch(url.toString(), {
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
        });

        if (!response.ok) {
            const error = await response.text();
            throw new EVMManagerError(
                `1inch quote failed: ${error}`,
                'QUOTE_FAILED'
            );
        }

        const data: OneInchQuoteResponse = await response.json();

        // Calculate minimum output with slippage
        const toAmountBn = BigInt(data.toAmount);
        const slippageMultiplier = BigInt(10000 - params.slippageTolerance);
        const toAmountMin = (toAmountBn * slippageMultiplier / BigInt(10000)).toString();

        return {
            fromToken: {
                address: data.fromToken.address,
                symbol: data.fromToken.symbol,
                name: data.fromToken.name,
                decimals: data.fromToken.decimals,
                chainId: chainConfig.chainId,
            },
            toToken: {
                address: data.toToken.address,
                symbol: data.toToken.symbol,
                name: data.toToken.name,
                decimals: data.toToken.decimals,
                chainId: chainConfig.chainId,
            },
            fromAmount: params.amount,
            toAmount: data.toAmount,
            toAmountMin,
            priceImpact: 0, // Would need additional calculation
            estimatedGas: data.estimatedGas.toString(),
            route: data.protocols.flat().flat().map((p: any) => ({
                protocol: p.name || 'Unknown',
                poolAddress: p.fromTokenAddress || '',
                tokenIn: p.fromTokenAddress || '',
                tokenOut: p.toTokenAddress || '',
            })),
            aggregator: '1inch',
        };
    }

    /**
     * Get swap quote from Paraswap
     */
    async getQuoteParaswap(params: SwapParams): Promise<SwapQuote> {
        const chainId = this.getOneInchChainId(params.chain);
        const chainConfig = getChainConfig(params.chain);

        const fromToken = isNativeToken(params.fromTokenAddress)
            ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
            : params.fromTokenAddress;
        const toToken = isNativeToken(params.toTokenAddress)
            ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
            : params.toTokenAddress;

        const url = new URL('https://apiv5.paraswap.io/prices');
        url.searchParams.set('srcToken', fromToken);
        url.searchParams.set('destToken', toToken);
        url.searchParams.set('amount', params.amount);
        url.searchParams.set('srcDecimals', '18');
        url.searchParams.set('destDecimals', '18');
        url.searchParams.set('network', chainId.toString());
        url.searchParams.set('side', 'SELL');

        const response = await fetch(url.toString());

        if (!response.ok) {
            const error = await response.text();
            throw new EVMManagerError(
                `Paraswap quote failed: ${error}`,
                'QUOTE_FAILED'
            );
        }

        const data: ParaswapPriceResponse = await response.json();
        const priceRoute = data.priceRoute;

        // Calculate minimum output with slippage
        const toAmountBn = BigInt(priceRoute.destAmount);
        const slippageMultiplier = BigInt(10000 - params.slippageTolerance);
        const toAmountMin = (toAmountBn * slippageMultiplier / BigInt(10000)).toString();

        return {
            fromToken: {
                address: priceRoute.srcToken,
                symbol: '', // Would need additional lookup
                name: '',
                decimals: priceRoute.srcDecimals,
                chainId: chainConfig.chainId,
            },
            toToken: {
                address: priceRoute.destToken,
                symbol: '',
                name: '',
                decimals: priceRoute.destDecimals,
                chainId: chainConfig.chainId,
            },
            fromAmount: params.amount,
            toAmount: priceRoute.destAmount,
            toAmountMin,
            priceImpact: 0,
            estimatedGas: priceRoute.gasCost,
            route: priceRoute.bestRoute.map((r: any) => ({
                protocol: r.exchange || 'Unknown',
                poolAddress: '',
                tokenIn: r.srcToken || '',
                tokenOut: r.destToken || '',
            })),
            aggregator: 'paraswap',
        };
    }

    /**
     * Get best quote from multiple aggregators
     */
    async getBestQuote(params: SwapParams): Promise<SwapQuote> {
        const quotes: SwapQuote[] = [];
        const errors: string[] = [];

        // Try 1inch if API key available
        if (this.config.apiKeys?.oneInch) {
            try {
                const quote = await this.getQuoteOneInch(params);
                quotes.push(quote);
            } catch (err: any) {
                errors.push(`1inch: ${err.message}`);
            }
        }

        // Try Paraswap (no API key required)
        try {
            const quote = await this.getQuoteParaswap(params);
            quotes.push(quote);
        } catch (err: any) {
            errors.push(`Paraswap: ${err.message}`);
        }

        if (quotes.length === 0) {
            throw new EVMManagerError(
                `No quotes available. Errors: ${errors.join('; ')}`,
                'NO_QUOTES'
            );
        }

        // Return quote with best output amount
        return quotes.reduce((best, current) =>
            BigInt(current.toAmount) > BigInt(best.toAmount) ? current : best
        );
    }

    /**
     * Build swap transaction data for 1inch
     */
    async buildSwapTransaction(
        params: SwapParams,
        fromAddress: string
    ): Promise<{
        to: string;
        data: string;
        value: string;
        gasLimit: string;
    }> {
        const chainId = this.getOneInchChainId(params.chain);

        const fromToken = isNativeToken(params.fromTokenAddress)
            ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
            : params.fromTokenAddress;
        const toToken = isNativeToken(params.toTokenAddress)
            ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
            : params.toTokenAddress;

        const apiKey = this.config.apiKeys?.oneInch;
        if (!apiKey) {
            throw new EVMManagerError(
                '1inch API key required for swap execution',
                'API_KEY_MISSING'
            );
        }

        const url = new URL(
            `https://api.1inch.dev/swap/v6.0/${chainId}/swap`
        );
        url.searchParams.set('src', fromToken);
        url.searchParams.set('dst', toToken);
        url.searchParams.set('amount', params.amount);
        url.searchParams.set('from', fromAddress);
        url.searchParams.set('slippage', (params.slippageTolerance / 100).toString());
        if (params.recipient) {
            url.searchParams.set('receiver', params.recipient);
        }

        const response = await fetch(url.toString(), {
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
        });

        if (!response.ok) {
            const error = await response.text();
            throw new EVMManagerError(
                `1inch swap build failed: ${error}`,
                'SWAP_BUILD_FAILED'
            );
        }

        const data: OneInchSwapResponse = await response.json();

        return {
            to: data.tx.to,
            data: data.tx.data,
            value: data.tx.value,
            gasLimit: data.tx.gas.toString(),
        };
    }

    /**
     * Check and approve token for spending
     */
    async checkAllowance(
        tokenAddress: string,
        ownerAddress: string,
        spenderAddress: string,
        chain: SupportedChain
    ): Promise<bigint> {
        if (isNativeToken(tokenAddress)) {
            return BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
        }

        const rpcUrl =
            this.config.rpcOverrides?.[chain] || CHAIN_CONFIGS[chain].rpcUrl;

        // allowance(address,address) selector = 0xdd62ed3e
        const data =
            '0xdd62ed3e' +
            ownerAddress.slice(2).toLowerCase().padStart(64, '0') +
            spenderAddress.slice(2).toLowerCase().padStart(64, '0');

        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_call',
                params: [{ to: tokenAddress, data }, 'latest'],
                id: 1,
            }),
        });

        const result = await response.json();
        return BigInt(result.result || '0');
    }

    /**
     * Build approval transaction
     */
    buildApprovalTransaction(
        tokenAddress: string,
        spenderAddress: string,
        amount?: string
    ): { to: string; data: string } {
        // approve(address,uint256) selector = 0x095ea7b3
        const approvalAmount =
            amount ||
            '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
        const paddedSpender = spenderAddress.slice(2).toLowerCase().padStart(64, '0');
        const paddedAmount = BigInt(approvalAmount).toString(16).padStart(64, '0');

        return {
            to: tokenAddress,
            data: '0x095ea7b3' + paddedSpender + paddedAmount,
        };
    }

    /**
     * Get 1inch router address for approval
     */
    getOneInchRouterAddress(chain: SupportedChain): string {
        // 1inch v6 aggregation router
        const routers: Record<SupportedChain, string> = {
            ethereum: '0x111111125421cA6dc452d289314280a0f8842A65',
            bsc: '0x111111125421cA6dc452d289314280a0f8842A65',
            arbitrum: '0x111111125421cA6dc452d289314280a0f8842A65',
            base: '0x111111125421cA6dc452d289314280a0f8842A65',
        };
        return routers[chain];
    }
}

// ============================================================================
// Rebalancing Service
// ============================================================================

export class RebalanceService {
    private swapService: SwapService;
    private balanceService: BalanceService;
    private config: EVMManagerConfig;

    constructor(config: EVMManagerConfig) {
        this.config = config;
        this.swapService = new SwapService(config);
        this.balanceService = getBalanceService(config);
    }

    /**
     * Calculate rebalancing strategy based on target allocations
     */
    async calculateRebalanceStrategy(
        address: string,
        chain: SupportedChain,
        targetAllocations: { tokenAddress: string; targetPercentage: number }[]
    ): Promise<RebalanceStrategy> {
        // Get current balances
        const balances = await this.balanceService.getAllCommonTokenBalances(
            address,
            chain
        );

        const totalValueUsd = balances.reduce((sum, b) => sum + b.valueUsd, 0);

        if (totalValueUsd === 0) {
            throw new EVMManagerError(
                'No portfolio value to rebalance',
                'ZERO_PORTFOLIO'
            );
        }

        // Validate allocations sum to 100%
        const totalTargetPercent = targetAllocations.reduce(
            (sum, a) => sum + a.targetPercentage,
            0
        );
        if (Math.abs(totalTargetPercent - 100) > 0.01) {
            throw new EVMManagerError(
                `Target allocations must sum to 100%, got ${totalTargetPercent}%`,
                'INVALID_ALLOCATION'
            );
        }

        // Build allocation map
        const allocations: PortfolioAllocation[] = [];
        const balanceMap = new Map(
            balances.map((b) => [b.token.address.toLowerCase(), b])
        );

        for (const target of targetAllocations) {
            const balance = balanceMap.get(target.tokenAddress.toLowerCase());
            const currentValueUsd = balance?.valueUsd || 0;
            const currentPercentage = (currentValueUsd / totalValueUsd) * 100;
            const targetValueUsd = (target.targetPercentage / 100) * totalValueUsd;

            allocations.push({
                token: balance?.token || {
                    address: target.tokenAddress,
                    symbol: 'UNKNOWN',
                    name: 'Unknown Token',
                    decimals: 18,
                    chainId: CHAIN_CONFIGS[chain].chainId,
                },
                targetPercentage: target.targetPercentage,
                currentPercentage,
                currentValueUsd,
                targetValueUsd,
                differenceUsd: targetValueUsd - currentValueUsd,
            });
        }

        // Calculate swaps needed
        const swapsNeeded = this.calculateSwapsNeeded(allocations);

        return {
            allocations,
            chain,
            totalValueUsd,
            swapsNeeded,
        };
    }

    /**
     * Calculate the swaps needed to achieve target allocation
     */
    private calculateSwapsNeeded(
        allocations: PortfolioAllocation[]
    ): RebalanceSwap[] {
        const swaps: RebalanceSwap[] = [];

        // Sort by difference - negative first (need to sell)
        const sorted = [...allocations].sort(
            (a, b) => a.differenceUsd - b.differenceUsd
        );

        const toSell = sorted.filter((a) => a.differenceUsd < -1); // $1 threshold
        const toBuy = sorted.filter((a) => a.differenceUsd > 1);

        // Match sells with buys
        let sellIdx = 0;
        let buyIdx = 0;
        let sellRemaining = toSell[sellIdx]
            ? Math.abs(toSell[sellIdx].differenceUsd)
            : 0;
        let buyRemaining = toBuy[buyIdx] ? toBuy[buyIdx].differenceUsd : 0;

        while (sellIdx < toSell.length && buyIdx < toBuy.length) {
            const swapAmount = Math.min(sellRemaining, buyRemaining);

            if (swapAmount > 1) {
                // Estimate amounts based on USD value and price
                const sellToken = toSell[sellIdx];
                const buyToken = toBuy[buyIdx];

                const price =
                    sellToken.currentValueUsd /
                    (sellToken.currentValueUsd > 0
                        ? Number(sellToken.currentPercentage)
                        : 1);
                const amountIn = ((swapAmount / sellToken.currentValueUsd) *
                    Number(BigInt(10 ** sellToken.token.decimals))).toString();

                swaps.push({
                    from: sellToken.token,
                    to: buyToken.token,
                    amountIn,
                    estimatedAmountOut: '0', // Would need quote
                    valueUsd: swapAmount,
                });
            }

            sellRemaining -= swapAmount;
            buyRemaining -= swapAmount;

            if (sellRemaining <= 1) {
                sellIdx++;
                sellRemaining = toSell[sellIdx]
                    ? Math.abs(toSell[sellIdx].differenceUsd)
                    : 0;
            }
            if (buyRemaining <= 1) {
                buyIdx++;
                buyRemaining = toBuy[buyIdx] ? toBuy[buyIdx].differenceUsd : 0;
            }
        }

        return swaps;
    }

    /**
     * Get quotes for all rebalancing swaps
     */
    async getRebalanceQuotes(
        strategy: RebalanceStrategy,
        slippageTolerance: number = 100 // 1% default
    ): Promise<SwapQuote[]> {
        const quotes: SwapQuote[] = [];

        for (const swap of strategy.swapsNeeded) {
            try {
                const quote = await this.swapService.getBestQuote({
                    fromTokenAddress: swap.from.address,
                    toTokenAddress: swap.to.address,
                    amount: swap.amountIn,
                    slippageTolerance,
                    chain: strategy.chain,
                });
                quotes.push(quote);
            } catch (err: any) {
                console.warn(
                    `Failed to get quote for ${swap.from.symbol} -> ${swap.to.symbol}:`,
                    err.message
                );
            }
        }

        return quotes;
    }
}

// ============================================================================
// Factory Functions
// ============================================================================

let swapServiceInstance: SwapService | null = null;
let rebalanceServiceInstance: RebalanceService | null = null;

export function getSwapService(config: EVMManagerConfig): SwapService {
    if (!swapServiceInstance) {
        swapServiceInstance = new SwapService(config);
    }
    return swapServiceInstance;
}

export function getRebalanceService(config: EVMManagerConfig): RebalanceService {
    if (!rebalanceServiceInstance) {
        rebalanceServiceInstance = new RebalanceService(config);
    }
    return rebalanceServiceInstance;
}

export function resetSwapServices(): void {
    swapServiceInstance = null;
    rebalanceServiceInstance = null;
}
