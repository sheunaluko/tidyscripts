/**
 * EVM Account Yield Manager - AAVE V3 Service
 *
 * Yield opportunities listing, deposit, and withdrawal functionality for AAVE V3
 */

import {
    SupportedChain,
    TokenInfo,
    AaveYieldOpportunity,
    AaveUserPosition,
    AaveDepositParams,
    AaveWithdrawParams,
    AaveOperationResult,
    EVMManagerConfig,
    EVMManagerError,
} from './types';
import {
    CHAIN_CONFIGS,
    AAVE_POOL_ABI,
    AAVE_DATA_PROVIDER_ABI,
    getChainConfig,
} from './chains';
import { BalanceService, getBalanceService } from './balances';

// ============================================================================
// Constants
// ============================================================================

const RAY = BigInt(10) ** BigInt(27);
const SECONDS_PER_YEAR = 31536000;
const MAX_UINT256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

// ============================================================================
// RPC Helper
// ============================================================================

interface JsonRpcRequest {
    jsonrpc: '2.0';
    method: string;
    params: any[];
    id: number;
}

let requestId = 1;

async function rpcCall(rpcUrl: string, method: string, params: any[]): Promise<any> {
    const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method,
        params,
        id: requestId++,
    };

    const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        throw new EVMManagerError(`RPC request failed: ${response.statusText}`, 'RPC_ERROR');
    }

    const data = await response.json();
    if (data.error) {
        throw new EVMManagerError(`RPC error: ${data.error.message}`, 'RPC_ERROR', data.error);
    }

    return data.result;
}

async function rpcBatchCall(
    rpcUrl: string,
    requests: { method: string; params: any[] }[]
): Promise<any[]> {
    const batch = requests.map((req, idx) => ({
        jsonrpc: '2.0' as const,
        method: req.method,
        params: req.params,
        id: requestId + idx,
    }));
    requestId += requests.length;

    const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
    });

    if (!response.ok) {
        throw new EVMManagerError(`RPC batch request failed`, 'RPC_ERROR');
    }

    const data = await response.json();
    data.sort((a: any, b: any) => a.id - b.id);

    return data.map((d: any) => (d.error ? null : d.result));
}

// ============================================================================
// AAVE Service
// ============================================================================

export class AaveService {
    private config: EVMManagerConfig;
    private balanceService: BalanceService;
    private reserveCache: Map<string, { data: AaveYieldOpportunity[]; timestamp: number }> =
        new Map();
    private readonly CACHE_TTL = 60000; // 1 minute

    constructor(config: EVMManagerConfig) {
        this.config = config;
        this.balanceService = getBalanceService(config);
    }

    /**
     * Get RPC URL for a chain
     */
    private getRpcUrl(chain: SupportedChain): string {
        return this.config.rpcOverrides?.[chain] || CHAIN_CONFIGS[chain].rpcUrl;
    }

    /**
     * Convert RAY rate to APY percentage
     */
    private rayToApy(rayRate: bigint): number {
        // APY = ((1 + rate/secondsPerYear)^secondsPerYear - 1) * 100
        // Simplified: APY ≈ rate * 100 / RAY (for display purposes)
        return (Number(rayRate) * 100) / Number(RAY);
    }

    /**
     * Encode function call data
     */
    private encodeCall(selector: string, params: string[]): string {
        return selector + params.join('');
    }

    /**
     * Pad address to 32 bytes
     */
    private padAddress(address: string): string {
        return address.slice(2).toLowerCase().padStart(64, '0');
    }

    /**
     * Pad uint256 to 32 bytes
     */
    private padUint256(value: string | bigint): string {
        return BigInt(value).toString(16).padStart(64, '0');
    }

    /**
     * Get all yield opportunities on AAVE for a chain
     */
    async getYieldOpportunities(chain: SupportedChain): Promise<AaveYieldOpportunity[]> {
        const cacheKey = chain;
        const cached = this.reserveCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.data;
        }

        const chainConfig = getChainConfig(chain);
        const rpcUrl = this.getRpcUrl(chain);

        if (!chainConfig.aavePoolDataProvider) {
            throw new EVMManagerError(
                `AAVE not available on ${chain}`,
                'AAVE_NOT_AVAILABLE'
            );
        }

        // Get all reserve tokens
        // getAllReservesTokens() selector = 0xb316ff89
        const tokensResult = await rpcCall(rpcUrl, 'eth_call', [
            {
                to: chainConfig.aavePoolDataProvider,
                data: '0xb316ff89',
            },
            'latest',
        ]);

        // Parse token addresses from result
        const tokens = this.parseReserveTokens(tokensResult);

        // Batch fetch reserve data for all tokens
        const opportunities: AaveYieldOpportunity[] = [];

        for (const token of tokens) {
            try {
                const opportunity = await this.getReserveData(chain, token.address, token.symbol);
                if (opportunity.isActive && !opportunity.isFrozen) {
                    opportunities.push(opportunity);
                }
            } catch (err) {
                console.warn(`Failed to get reserve data for ${token.symbol}:`, err);
            }
        }

        // Sort by supply APY descending
        opportunities.sort((a, b) => b.supplyApy - a.supplyApy);

        this.reserveCache.set(cacheKey, { data: opportunities, timestamp: Date.now() });

        return opportunities;
    }

    /**
     * Parse reserve tokens from encoded response
     */
    private parseReserveTokens(result: string): { symbol: string; address: string }[] {
        const tokens: { symbol: string; address: string }[] = [];

        if (!result || result === '0x') return tokens;

        try {
            // Skip function selector, decode array
            const data = result.slice(2);

            // First 32 bytes: offset to array
            // Next 32 bytes: array length
            const arrayLengthHex = data.slice(64, 128);
            const arrayLength = parseInt(arrayLengthHex, 16);

            // Each element is (string symbol, address tokenAddress)
            // Dynamic tuple: offset pointer for each element
            let offset = 128; // Start of element pointers

            for (let i = 0; i < Math.min(arrayLength, 50); i++) {
                // Limit to 50 tokens
                try {
                    // Get pointer to this element
                    const elementOffset = parseInt(data.slice(offset + i * 64, offset + (i + 1) * 64), 16) * 2;

                    // At element: string offset, address
                    const stringOffset =
                        parseInt(data.slice(64 + elementOffset, 64 + elementOffset + 64), 16) * 2;
                    const addressHex = data.slice(64 + elementOffset + 64, 64 + elementOffset + 128);
                    const address = '0x' + addressHex.slice(24);

                    // Get string
                    const stringDataOffset = 64 + elementOffset + stringOffset;
                    const stringLength = parseInt(
                        data.slice(stringDataOffset, stringDataOffset + 64),
                        16
                    );
                    const symbolHex = data.slice(
                        stringDataOffset + 64,
                        stringDataOffset + 64 + stringLength * 2
                    );
                    let symbol = '';
                    for (let j = 0; j < symbolHex.length; j += 2) {
                        const charCode = parseInt(symbolHex.slice(j, j + 2), 16);
                        if (charCode > 0) symbol += String.fromCharCode(charCode);
                    }

                    if (address && address !== '0x0000000000000000000000000000000000000000') {
                        tokens.push({ symbol, address });
                    }
                } catch (e) {
                    // Skip malformed entries
                }
            }
        } catch (e) {
            console.warn('Failed to parse reserve tokens:', e);
        }

        return tokens;
    }

    /**
     * Get detailed reserve data for a single asset
     */
    private async getReserveData(
        chain: SupportedChain,
        assetAddress: string,
        symbol: string
    ): Promise<AaveYieldOpportunity> {
        const chainConfig = getChainConfig(chain);
        const rpcUrl = this.getRpcUrl(chain);

        // getReserveConfigurationData(address) = 0x3e150141
        const configSelector = '0x3e150141';
        // getReserveData(address) = 0x35ea6a75
        const dataSelector = '0x35ea6a75';
        // getReserveTokensAddresses(address) = 0xd2493b6c
        const tokensSelector = '0xd2493b6c';

        const paddedAsset = this.padAddress(assetAddress);

        const results = await rpcBatchCall(rpcUrl, [
            {
                method: 'eth_call',
                params: [
                    {
                        to: chainConfig.aavePoolDataProvider,
                        data: configSelector + paddedAsset,
                    },
                    'latest',
                ],
            },
            {
                method: 'eth_call',
                params: [
                    {
                        to: chainConfig.aavePoolDataProvider,
                        data: dataSelector + paddedAsset,
                    },
                    'latest',
                ],
            },
            {
                method: 'eth_call',
                params: [
                    {
                        to: chainConfig.aavePoolDataProvider,
                        data: tokensSelector + paddedAsset,
                    },
                    'latest',
                ],
            },
        ]);

        const [configResult, dataResult, tokensResult] = results;

        // Parse configuration data
        const configData = this.parseConfigData(configResult);
        const reserveData = this.parseReserveData(dataResult);
        const tokenAddresses = this.parseTokenAddresses(tokensResult);

        // Get token price
        const priceUsd = await this.balanceService.getTokenPrice(assetAddress, chain);

        // Calculate USD values
        const totalSupplyFormatted =
            Number(BigInt(reserveData.totalAToken)) / Math.pow(10, configData.decimals);
        const availableLiquidityFormatted =
            Number(
                BigInt(reserveData.totalAToken) -
                    BigInt(reserveData.totalStableDebt) -
                    BigInt(reserveData.totalVariableDebt)
            ) / Math.pow(10, configData.decimals);

        const totalSupply = BigInt(reserveData.totalAToken);
        const totalDebt =
            BigInt(reserveData.totalStableDebt) + BigInt(reserveData.totalVariableDebt);
        const utilizationRate =
            totalSupply > BigInt(0) ? Number((totalDebt * BigInt(10000)) / totalSupply) / 100 : 0;

        return {
            chain,
            asset: {
                address: assetAddress,
                symbol,
                name: symbol,
                decimals: configData.decimals,
                chainId: chainConfig.chainId,
            },
            aToken: {
                address: tokenAddresses.aToken,
                symbol: `a${symbol}`,
                name: `Aave ${symbol}`,
                decimals: configData.decimals,
                chainId: chainConfig.chainId,
            },
            supplyApy: this.rayToApy(BigInt(reserveData.liquidityRate)),
            supplyApyFormatted: this.rayToApy(BigInt(reserveData.liquidityRate)).toFixed(2) + '%',
            borrowApyVariable: this.rayToApy(BigInt(reserveData.variableBorrowRate)),
            borrowApyStable: this.rayToApy(BigInt(reserveData.stableBorrowRate)),
            totalSupply: reserveData.totalAToken,
            totalSupplyUsd: totalSupplyFormatted * priceUsd,
            availableLiquidity: availableLiquidityFormatted.toString(),
            availableLiquidityUsd: availableLiquidityFormatted * priceUsd,
            utilizationRate,
            ltv: configData.ltv / 100,
            liquidationThreshold: configData.liquidationThreshold / 100,
            canBeCollateral: configData.usageAsCollateralEnabled,
            canBeBorrowed: configData.borrowingEnabled,
            isActive: configData.isActive,
            isFrozen: configData.isFrozen,
        };
    }

    /**
     * Parse reserve configuration data
     */
    private parseConfigData(result: string | null): {
        decimals: number;
        ltv: number;
        liquidationThreshold: number;
        liquidationBonus: number;
        reserveFactor: number;
        usageAsCollateralEnabled: boolean;
        borrowingEnabled: boolean;
        stableBorrowRateEnabled: boolean;
        isActive: boolean;
        isFrozen: boolean;
    } {
        const defaultConfig = {
            decimals: 18,
            ltv: 0,
            liquidationThreshold: 0,
            liquidationBonus: 0,
            reserveFactor: 0,
            usageAsCollateralEnabled: false,
            borrowingEnabled: false,
            stableBorrowRateEnabled: false,
            isActive: false,
            isFrozen: false,
        };

        if (!result || result === '0x') return defaultConfig;

        try {
            const data = result.slice(2);
            // Each value is 32 bytes
            return {
                decimals: parseInt(data.slice(0, 64), 16),
                ltv: parseInt(data.slice(64, 128), 16),
                liquidationThreshold: parseInt(data.slice(128, 192), 16),
                liquidationBonus: parseInt(data.slice(192, 256), 16),
                reserveFactor: parseInt(data.slice(256, 320), 16),
                usageAsCollateralEnabled: parseInt(data.slice(320, 384), 16) === 1,
                borrowingEnabled: parseInt(data.slice(384, 448), 16) === 1,
                stableBorrowRateEnabled: parseInt(data.slice(448, 512), 16) === 1,
                isActive: parseInt(data.slice(512, 576), 16) === 1,
                isFrozen: parseInt(data.slice(576, 640), 16) === 1,
            };
        } catch {
            return defaultConfig;
        }
    }

    /**
     * Parse reserve data
     */
    private parseReserveData(result: string | null): {
        unbacked: string;
        accruedToTreasuryScaled: string;
        totalAToken: string;
        totalStableDebt: string;
        totalVariableDebt: string;
        liquidityRate: string;
        variableBorrowRate: string;
        stableBorrowRate: string;
        averageStableBorrowRate: string;
        liquidityIndex: string;
        variableBorrowIndex: string;
        lastUpdateTimestamp: number;
    } {
        const defaultData = {
            unbacked: '0',
            accruedToTreasuryScaled: '0',
            totalAToken: '0',
            totalStableDebt: '0',
            totalVariableDebt: '0',
            liquidityRate: '0',
            variableBorrowRate: '0',
            stableBorrowRate: '0',
            averageStableBorrowRate: '0',
            liquidityIndex: '0',
            variableBorrowIndex: '0',
            lastUpdateTimestamp: 0,
        };

        if (!result || result === '0x') return defaultData;

        try {
            const data = result.slice(2);
            return {
                unbacked: BigInt('0x' + data.slice(0, 64)).toString(),
                accruedToTreasuryScaled: BigInt('0x' + data.slice(64, 128)).toString(),
                totalAToken: BigInt('0x' + data.slice(128, 192)).toString(),
                totalStableDebt: BigInt('0x' + data.slice(192, 256)).toString(),
                totalVariableDebt: BigInt('0x' + data.slice(256, 320)).toString(),
                liquidityRate: BigInt('0x' + data.slice(320, 384)).toString(),
                variableBorrowRate: BigInt('0x' + data.slice(384, 448)).toString(),
                stableBorrowRate: BigInt('0x' + data.slice(448, 512)).toString(),
                averageStableBorrowRate: BigInt('0x' + data.slice(512, 576)).toString(),
                liquidityIndex: BigInt('0x' + data.slice(576, 640)).toString(),
                variableBorrowIndex: BigInt('0x' + data.slice(640, 704)).toString(),
                lastUpdateTimestamp: parseInt(data.slice(704, 768), 16),
            };
        } catch {
            return defaultData;
        }
    }

    /**
     * Parse token addresses
     */
    private parseTokenAddresses(result: string | null): {
        aToken: string;
        stableDebtToken: string;
        variableDebtToken: string;
    } {
        const defaultAddresses = {
            aToken: '0x0000000000000000000000000000000000000000',
            stableDebtToken: '0x0000000000000000000000000000000000000000',
            variableDebtToken: '0x0000000000000000000000000000000000000000',
        };

        if (!result || result === '0x') return defaultAddresses;

        try {
            const data = result.slice(2);
            return {
                aToken: '0x' + data.slice(24, 64),
                stableDebtToken: '0x' + data.slice(88, 128),
                variableDebtToken: '0x' + data.slice(152, 192),
            };
        } catch {
            return defaultAddresses;
        }
    }

    /**
     * Get top yield opportunities sorted by APY
     */
    async getTopYieldOpportunities(
        chain: SupportedChain,
        limit: number = 10
    ): Promise<AaveYieldOpportunity[]> {
        const opportunities = await this.getYieldOpportunities(chain);
        return opportunities.slice(0, limit);
    }

    /**
     * Get yield opportunities across all chains
     */
    async getYieldOpportunitiesAllChains(): Promise<
        Record<SupportedChain, AaveYieldOpportunity[]>
    > {
        const chains: SupportedChain[] = ['ethereum', 'bsc', 'arbitrum', 'base'];
        const results: Record<SupportedChain, AaveYieldOpportunity[]> = {} as any;

        await Promise.all(
            chains.map(async (chain) => {
                try {
                    results[chain] = await this.getYieldOpportunities(chain);
                } catch (err) {
                    console.warn(`Failed to get yield opportunities for ${chain}:`, err);
                    results[chain] = [];
                }
            })
        );

        return results;
    }

    /**
     * Get best yield opportunity for a specific asset across chains
     */
    async getBestYieldForAsset(
        symbol: string
    ): Promise<{ chain: SupportedChain; opportunity: AaveYieldOpportunity } | null> {
        const allOpportunities = await this.getYieldOpportunitiesAllChains();

        let best: { chain: SupportedChain; opportunity: AaveYieldOpportunity } | null = null;

        for (const [chain, opportunities] of Object.entries(allOpportunities)) {
            const match = opportunities.find(
                (o) => o.asset.symbol.toUpperCase() === symbol.toUpperCase()
            );
            if (match && (!best || match.supplyApy > best.opportunity.supplyApy)) {
                best = { chain: chain as SupportedChain, opportunity: match };
            }
        }

        return best;
    }

    /**
     * Get user's AAVE positions on a chain
     */
    async getUserPositions(
        userAddress: string,
        chain: SupportedChain
    ): Promise<AaveUserPosition[]> {
        const opportunities = await this.getYieldOpportunities(chain);
        const chainConfig = getChainConfig(chain);
        const rpcUrl = this.getRpcUrl(chain);

        const positions: AaveUserPosition[] = [];

        // Batch fetch user data for all reserves
        const requests = opportunities.map((opp) => ({
            method: 'eth_call',
            params: [
                {
                    to: chainConfig.aavePoolDataProvider,
                    // getUserReserveData(address asset, address user) = 0x28dd2d01
                    data:
                        '0x28dd2d01' +
                        this.padAddress(opp.asset.address) +
                        this.padAddress(userAddress),
                },
                'latest',
            ],
        }));

        const results = await rpcBatchCall(rpcUrl, requests);

        for (let i = 0; i < opportunities.length; i++) {
            const opp = opportunities[i];
            const result = results[i];

            if (!result || result === '0x') continue;

            try {
                const data = result.slice(2);
                const aTokenBalance = BigInt('0x' + data.slice(0, 64));
                const stableDebt = BigInt('0x' + data.slice(64, 128));
                const variableDebt = BigInt('0x' + data.slice(128, 192));

                const totalSupplied = aTokenBalance;
                const totalBorrowed = stableDebt + variableDebt;

                if (totalSupplied > BigInt(0) || totalBorrowed > BigInt(0)) {
                    const priceUsd = await this.balanceService.getTokenPrice(
                        opp.asset.address,
                        chain
                    );

                    const suppliedFormatted =
                        Number(totalSupplied) / Math.pow(10, opp.asset.decimals);
                    const borrowedFormatted =
                        Number(totalBorrowed) / Math.pow(10, opp.asset.decimals);

                    positions.push({
                        chain,
                        asset: opp.asset,
                        supplied: totalSupplied.toString(),
                        suppliedFormatted,
                        suppliedUsd: suppliedFormatted * priceUsd,
                        borrowed: totalBorrowed.toString(),
                        borrowedFormatted,
                        borrowedUsd: borrowedFormatted * priceUsd,
                    });
                }
            } catch (err) {
                // Skip malformed data
            }
        }

        return positions;
    }

    /**
     * Get user's overall AAVE account data (health factor, etc.)
     */
    async getUserAccountData(
        userAddress: string,
        chain: SupportedChain
    ): Promise<{
        totalCollateralUsd: number;
        totalDebtUsd: number;
        availableBorrowsUsd: number;
        currentLiquidationThreshold: number;
        ltv: number;
        healthFactor: number;
    }> {
        const chainConfig = getChainConfig(chain);
        const rpcUrl = this.getRpcUrl(chain);

        // getUserAccountData(address) = 0xbf92857c
        const result = await rpcCall(rpcUrl, 'eth_call', [
            {
                to: chainConfig.aavePoolAddress,
                data: '0xbf92857c' + this.padAddress(userAddress),
            },
            'latest',
        ]);

        if (!result || result === '0x') {
            return {
                totalCollateralUsd: 0,
                totalDebtUsd: 0,
                availableBorrowsUsd: 0,
                currentLiquidationThreshold: 0,
                ltv: 0,
                healthFactor: 0,
            };
        }

        const data = result.slice(2);
        // Values are in base currency (USD with 8 decimals)
        const totalCollateralBase = BigInt('0x' + data.slice(0, 64));
        const totalDebtBase = BigInt('0x' + data.slice(64, 128));
        const availableBorrowsBase = BigInt('0x' + data.slice(128, 192));
        const currentLiquidationThreshold = parseInt(data.slice(192, 256), 16);
        const ltv = parseInt(data.slice(256, 320), 16);
        const healthFactor = BigInt('0x' + data.slice(320, 384));

        return {
            totalCollateralUsd: Number(totalCollateralBase) / 1e8,
            totalDebtUsd: Number(totalDebtBase) / 1e8,
            availableBorrowsUsd: Number(availableBorrowsBase) / 1e8,
            currentLiquidationThreshold: currentLiquidationThreshold / 100,
            ltv: ltv / 100,
            healthFactor: Number(healthFactor) / 1e18,
        };
    }

    /**
     * Build deposit transaction for AAVE
     */
    buildDepositTransaction(params: AaveDepositParams): {
        to: string;
        data: string;
        value: string;
    } {
        const chainConfig = getChainConfig(params.chain);

        if (!chainConfig.aavePoolAddress) {
            throw new EVMManagerError(
                `AAVE not available on ${params.chain}`,
                'AAVE_NOT_AVAILABLE'
            );
        }

        // supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)
        // selector = 0x617ba037
        const onBehalfOf = params.onBehalfOf || '0x0000000000000000000000000000000000000000';
        const referralCode = '0000'; // No referral

        const data =
            '0x617ba037' +
            this.padAddress(params.asset) +
            this.padUint256(params.amount) +
            this.padAddress(onBehalfOf) +
            referralCode.padStart(64, '0');

        return {
            to: chainConfig.aavePoolAddress,
            data,
            value: '0x0',
        };
    }

    /**
     * Build withdraw transaction for AAVE
     */
    buildWithdrawTransaction(params: AaveWithdrawParams): {
        to: string;
        data: string;
    } {
        const chainConfig = getChainConfig(params.chain);

        if (!chainConfig.aavePoolAddress) {
            throw new EVMManagerError(
                `AAVE not available on ${params.chain}`,
                'AAVE_NOT_AVAILABLE'
            );
        }

        // withdraw(address asset, uint256 amount, address to)
        // selector = 0x69328dec
        const to = params.to || '0x0000000000000000000000000000000000000000';
        const amount = params.amount === 'max' ? MAX_UINT256 : params.amount;

        const data =
            '0x69328dec' +
            this.padAddress(params.asset) +
            this.padUint256(amount) +
            this.padAddress(to);

        return {
            to: chainConfig.aavePoolAddress,
            data,
        };
    }

    /**
     * Build approval transaction for AAVE deposit
     */
    buildApprovalForDeposit(
        tokenAddress: string,
        chain: SupportedChain,
        amount?: string
    ): { to: string; data: string } {
        const chainConfig = getChainConfig(chain);

        if (!chainConfig.aavePoolAddress) {
            throw new EVMManagerError(
                `AAVE not available on ${chain}`,
                'AAVE_NOT_AVAILABLE'
            );
        }

        const approvalAmount = amount || MAX_UINT256;

        // approve(address spender, uint256 amount) = 0x095ea7b3
        const data =
            '0x095ea7b3' +
            this.padAddress(chainConfig.aavePoolAddress) +
            this.padUint256(approvalAmount);

        return {
            to: tokenAddress,
            data,
        };
    }

    /**
     * Check if token is approved for AAVE deposit
     */
    async checkApprovalForDeposit(
        tokenAddress: string,
        ownerAddress: string,
        chain: SupportedChain
    ): Promise<bigint> {
        const chainConfig = getChainConfig(chain);
        const rpcUrl = this.getRpcUrl(chain);

        if (!chainConfig.aavePoolAddress) {
            throw new EVMManagerError(
                `AAVE not available on ${chain}`,
                'AAVE_NOT_AVAILABLE'
            );
        }

        // allowance(address owner, address spender) = 0xdd62ed3e
        const data =
            '0xdd62ed3e' +
            this.padAddress(ownerAddress) +
            this.padAddress(chainConfig.aavePoolAddress);

        const result = await rpcCall(rpcUrl, 'eth_call', [
            { to: tokenAddress, data },
            'latest',
        ]);

        return BigInt(result || '0');
    }
}

// ============================================================================
// Factory
// ============================================================================

let aaveServiceInstance: AaveService | null = null;

export function getAaveService(config: EVMManagerConfig): AaveService {
    if (!aaveServiceInstance) {
        aaveServiceInstance = new AaveService(config);
    }
    return aaveServiceInstance;
}

export function resetAaveService(): void {
    aaveServiceInstance = null;
}
