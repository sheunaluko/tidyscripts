/**
 * EVM Account Yield Manager - Token Balance Service
 *
 * Multi-chain token balance fetching and tracking
 */

import {
    SupportedChain,
    TokenInfo,
    TokenBalance,
    NativeBalance,
    EVMManagerConfig,
    EVMManagerError,
} from './types';
import {
    CHAIN_CONFIGS,
    COMMON_TOKENS,
    ERC20_ABI,
    getChainConfig,
    isNativeToken,
} from './chains';

// ============================================================================
// RPC Provider Helper
// ============================================================================

interface JsonRpcRequest {
    jsonrpc: '2.0';
    method: string;
    params: any[];
    id: number;
}

interface JsonRpcResponse {
    jsonrpc: '2.0';
    result?: any;
    error?: {
        code: number;
        message: string;
    };
    id: number;
}

let requestId = 1;

/**
 * Make a JSON-RPC call to an EVM node
 */
async function rpcCall(
    rpcUrl: string,
    method: string,
    params: any[]
): Promise<any> {
    const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method,
        params,
        id: requestId++,
    };

    const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        throw new EVMManagerError(
            `RPC request failed: ${response.statusText}`,
            'RPC_ERROR'
        );
    }

    const data: JsonRpcResponse = await response.json();

    if (data.error) {
        throw new EVMManagerError(
            `RPC error: ${data.error.message}`,
            'RPC_ERROR',
            data.error
        );
    }

    return data.result;
}

/**
 * Make a batch JSON-RPC call
 */
async function rpcBatchCall(
    rpcUrl: string,
    requests: { method: string; params: any[] }[]
): Promise<any[]> {
    const batch: JsonRpcRequest[] = requests.map((req, idx) => ({
        jsonrpc: '2.0',
        method: req.method,
        params: req.params,
        id: requestId + idx,
    }));
    requestId += requests.length;

    const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
    });

    if (!response.ok) {
        throw new EVMManagerError(
            `RPC batch request failed: ${response.statusText}`,
            'RPC_ERROR'
        );
    }

    const data: JsonRpcResponse[] = await response.json();

    // Sort by id to maintain order
    data.sort((a, b) => a.id - b.id);

    return data.map((d) => {
        if (d.error) {
            console.warn(`RPC batch item error: ${d.error.message}`);
            return null;
        }
        return d.result;
    });
}

// ============================================================================
// Balance Service
// ============================================================================

export class BalanceService {
    private config: EVMManagerConfig;
    private priceCache: Map<string, { price: number; timestamp: number }> =
        new Map();
    private readonly PRICE_CACHE_TTL = 60000; // 1 minute

    constructor(config: EVMManagerConfig) {
        this.config = config;
    }

    /**
     * Get RPC URL for a chain, with optional override
     */
    private getRpcUrl(chain: SupportedChain): string {
        return this.config.rpcOverrides?.[chain] || CHAIN_CONFIGS[chain].rpcUrl;
    }

    /**
     * Get native token balance for an address
     */
    async getNativeBalance(
        address: string,
        chain: SupportedChain
    ): Promise<NativeBalance> {
        const rpcUrl = this.getRpcUrl(chain);
        const balanceHex = await rpcCall(rpcUrl, 'eth_getBalance', [
            address,
            'latest',
        ]);

        const balanceWei = BigInt(balanceHex);
        const balanceFormatted = Number(balanceWei) / 1e18;
        const chainConfig = getChainConfig(chain);
        const priceUsd = await this.getTokenPrice(
            chainConfig.wrappedNativeToken,
            chain
        );

        return {
            chain,
            balance: balanceWei.toString(),
            balanceFormatted,
            priceUsd,
            valueUsd: balanceFormatted * priceUsd,
        };
    }

    /**
     * Get ERC20 token balance
     */
    async getTokenBalance(
        address: string,
        tokenAddress: string,
        chain: SupportedChain
    ): Promise<TokenBalance> {
        const rpcUrl = this.getRpcUrl(chain);
        const chainConfig = getChainConfig(chain);

        // Handle native token
        if (isNativeToken(tokenAddress)) {
            const native = await this.getNativeBalance(address, chain);
            return {
                token: {
                    address: tokenAddress,
                    symbol: chainConfig.nativeCurrency.symbol,
                    name: chainConfig.nativeCurrency.name,
                    decimals: chainConfig.nativeCurrency.decimals,
                    chainId: chainConfig.chainId,
                },
                balance: native.balance,
                balanceFormatted: native.balanceFormatted,
                priceUsd: native.priceUsd,
                valueUsd: native.valueUsd,
                chain,
            };
        }

        // ERC20 token - batch call for balance and token info
        const balanceCallData = this.encodeBalanceOf(address);
        const nameCallData = '0x06fdde03'; // name()
        const symbolCallData = '0x95d89b41'; // symbol()
        const decimalsCallData = '0x313ce567'; // decimals()

        const results = await rpcBatchCall(rpcUrl, [
            {
                method: 'eth_call',
                params: [{ to: tokenAddress, data: balanceCallData }, 'latest'],
            },
            {
                method: 'eth_call',
                params: [{ to: tokenAddress, data: nameCallData }, 'latest'],
            },
            {
                method: 'eth_call',
                params: [{ to: tokenAddress, data: symbolCallData }, 'latest'],
            },
            {
                method: 'eth_call',
                params: [{ to: tokenAddress, data: decimalsCallData }, 'latest'],
            },
        ]);

        const [balanceHex, nameHex, symbolHex, decimalsHex] = results;

        const balance = balanceHex ? BigInt(balanceHex) : BigInt(0);
        const decimals = decimalsHex ? parseInt(decimalsHex, 16) : 18;
        const name = this.decodeString(nameHex) || 'Unknown';
        const symbol = this.decodeString(symbolHex) || 'UNKNOWN';

        const balanceFormatted = Number(balance) / Math.pow(10, decimals);
        const priceUsd = await this.getTokenPrice(tokenAddress, chain);

        return {
            token: {
                address: tokenAddress,
                symbol,
                name,
                decimals,
                chainId: chainConfig.chainId,
            },
            balance: balance.toString(),
            balanceFormatted,
            priceUsd,
            valueUsd: balanceFormatted * priceUsd,
            chain,
        };
    }

    /**
     * Get balances for multiple tokens
     */
    async getMultipleTokenBalances(
        address: string,
        tokenAddresses: string[],
        chain: SupportedChain
    ): Promise<TokenBalance[]> {
        const balances = await Promise.all(
            tokenAddresses.map((token) =>
                this.getTokenBalance(address, token, chain).catch((err) => {
                    console.warn(
                        `Failed to get balance for ${token} on ${chain}:`,
                        err.message
                    );
                    return null;
                })
            )
        );

        return balances.filter((b): b is TokenBalance => b !== null);
    }

    /**
     * Get all common token balances for an address on a chain
     */
    async getAllCommonTokenBalances(
        address: string,
        chain: SupportedChain
    ): Promise<TokenBalance[]> {
        const tokens = COMMON_TOKENS[chain];
        const tokenAddresses = Object.values(tokens);

        // Add native token
        const nativeBalance = await this.getNativeBalance(address, chain);
        const chainConfig = getChainConfig(chain);

        const nativeTokenBalance: TokenBalance = {
            token: {
                address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
                symbol: chainConfig.nativeCurrency.symbol,
                name: chainConfig.nativeCurrency.name,
                decimals: chainConfig.nativeCurrency.decimals,
                chainId: chainConfig.chainId,
            },
            balance: nativeBalance.balance,
            balanceFormatted: nativeBalance.balanceFormatted,
            priceUsd: nativeBalance.priceUsd,
            valueUsd: nativeBalance.valueUsd,
            chain,
        };

        const tokenBalances = await this.getMultipleTokenBalances(
            address,
            tokenAddresses,
            chain
        );

        return [nativeTokenBalance, ...tokenBalances].filter(
            (b) => b.balanceFormatted > 0
        );
    }

    /**
     * Get portfolio value across all chains
     */
    async getPortfolioAcrossChains(
        address: string,
        chains?: SupportedChain[]
    ): Promise<{
        totalValueUsd: number;
        byChain: Record<SupportedChain, { balances: TokenBalance[]; totalUsd: number }>;
    }> {
        const chainsToCheck = chains || (['ethereum', 'bsc', 'arbitrum', 'base'] as SupportedChain[]);

        const results = await Promise.all(
            chainsToCheck.map(async (chain) => {
                try {
                    const balances = await this.getAllCommonTokenBalances(address, chain);
                    const totalUsd = balances.reduce((sum, b) => sum + b.valueUsd, 0);
                    return { chain, balances, totalUsd };
                } catch (err) {
                    console.warn(`Failed to get balances for ${chain}:`, err);
                    return { chain, balances: [], totalUsd: 0 };
                }
            })
        );

        const byChain: Record<SupportedChain, { balances: TokenBalance[]; totalUsd: number }> =
            {} as any;
        let totalValueUsd = 0;

        for (const result of results) {
            byChain[result.chain] = {
                balances: result.balances,
                totalUsd: result.totalUsd,
            };
            totalValueUsd += result.totalUsd;
        }

        return { totalValueUsd, byChain };
    }

    /**
     * Get token price in USD (simplified - uses DeFi Llama or similar)
     */
    async getTokenPrice(
        tokenAddress: string,
        chain: SupportedChain
    ): Promise<number> {
        const cacheKey = `${chain}:${tokenAddress.toLowerCase()}`;
        const cached = this.priceCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.PRICE_CACHE_TTL) {
            return cached.price;
        }

        try {
            // Use DeFi Llama price API
            const chainMap: Record<SupportedChain, string> = {
                ethereum: 'ethereum',
                bsc: 'bsc',
                arbitrum: 'arbitrum',
                base: 'base',
            };

            const lllamaChain = chainMap[chain];
            const response = await fetch(
                `https://coins.llama.fi/prices/current/${lllamaChain}:${tokenAddress}`
            );

            if (!response.ok) {
                throw new Error('Price fetch failed');
            }

            const data = await response.json();
            const key = `${lllamaChain}:${tokenAddress}`.toLowerCase();
            const price = data.coins?.[key]?.price || 0;

            this.priceCache.set(cacheKey, { price, timestamp: Date.now() });
            return price;
        } catch (error) {
            console.warn(`Failed to get price for ${tokenAddress} on ${chain}`);
            return 0;
        }
    }

    /**
     * Encode balanceOf call data
     */
    private encodeBalanceOf(address: string): string {
        // balanceOf(address) selector = 0x70a08231
        const paddedAddress = address.slice(2).toLowerCase().padStart(64, '0');
        return '0x70a08231' + paddedAddress;
    }

    /**
     * Decode string from hex (ABI encoded)
     */
    private decodeString(hex: string | null): string {
        if (!hex || hex === '0x') return '';
        try {
            // Skip function selector if present, then decode
            const data = hex.startsWith('0x') ? hex.slice(2) : hex;
            if (data.length < 128) return '';

            // ABI encoded string: offset (32 bytes) + length (32 bytes) + data
            const lengthHex = data.slice(64, 128);
            const length = parseInt(lengthHex, 16);
            const strHex = data.slice(128, 128 + length * 2);

            // Convert hex to string
            let str = '';
            for (let i = 0; i < strHex.length; i += 2) {
                const charCode = parseInt(strHex.slice(i, i + 2), 16);
                if (charCode > 0) str += String.fromCharCode(charCode);
            }
            return str;
        } catch {
            return '';
        }
    }
}

// ============================================================================
// Factory
// ============================================================================

let balanceServiceInstance: BalanceService | null = null;

export function getBalanceService(config: EVMManagerConfig): BalanceService {
    if (!balanceServiceInstance) {
        balanceServiceInstance = new BalanceService(config);
    }
    return balanceServiceInstance;
}

export function resetBalanceService(): void {
    balanceServiceInstance = null;
}
