/**
 * EVM Account Yield Manager - Type Definitions
 *
 * Core types for managing EVM accounts, tokens, swaps, and yield operations
 */

// ============================================================================
// Chain Configuration Types
// ============================================================================

export type SupportedChain = 'ethereum' | 'bsc' | 'arbitrum' | 'base';

export interface ChainConfig {
    chainId: number;
    name: string;
    shortName: SupportedChain;
    rpcUrl: string;
    explorerUrl: string;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    aavePoolAddress?: string;
    aavePoolDataProvider?: string;
    wrappedNativeToken: string;
}

// ============================================================================
// Account Types
// ============================================================================

export interface EncryptedKeyStore {
    address: string;
    encryptedKey: string;
    iv: string;
    createdAt: number;
    chainType: 'evm';
}

export interface EVMAccount {
    address: string;
    nickname?: string;
    createdAt: number;
}

export interface AccountWithBalance extends EVMAccount {
    balances: TokenBalance[];
    totalValueUsd: number;
}

// ============================================================================
// Token Types
// ============================================================================

export interface TokenInfo {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    chainId: number;
    logoUri?: string;
}

export interface TokenBalance {
    token: TokenInfo;
    balance: string;
    balanceFormatted: number;
    priceUsd: number;
    valueUsd: number;
    chain: SupportedChain;
}

export interface NativeBalance {
    chain: SupportedChain;
    balance: string;
    balanceFormatted: number;
    priceUsd: number;
    valueUsd: number;
}

// ============================================================================
// Swap Types
// ============================================================================

export interface SwapQuote {
    fromToken: TokenInfo;
    toToken: TokenInfo;
    fromAmount: string;
    toAmount: string;
    toAmountMin: string;
    priceImpact: number;
    estimatedGas: string;
    route: SwapRoute[];
    aggregator: string;
}

export interface SwapRoute {
    protocol: string;
    poolAddress: string;
    tokenIn: string;
    tokenOut: string;
    fee?: number;
}

export interface SwapParams {
    fromTokenAddress: string;
    toTokenAddress: string;
    amount: string;
    slippageTolerance: number; // in basis points (100 = 1%)
    chain: SupportedChain;
    recipient?: string;
}

export interface SwapResult {
    success: boolean;
    txHash?: string;
    fromAmount: string;
    toAmount: string;
    gasUsed?: string;
    error?: string;
}

// ============================================================================
// AAVE Types
// ============================================================================

export interface AaveReserveData {
    underlyingAsset: string;
    name: string;
    symbol: string;
    decimals: number;
    aTokenAddress: string;
    variableDebtTokenAddress: string;
    stableDebtTokenAddress: string;
    interestRateStrategyAddress: string;
    availableLiquidity: string;
    totalStableDebt: string;
    totalVariableDebt: string;
    liquidityRate: string; // Supply APY in ray
    variableBorrowRate: string;
    stableBorrowRate: string;
    averageStableBorrowRate: string;
    liquidityIndex: string;
    variableBorrowIndex: string;
    lastUpdateTimestamp: number;
}

export interface AaveYieldOpportunity {
    chain: SupportedChain;
    asset: TokenInfo;
    aToken: TokenInfo;
    supplyApy: number;
    supplyApyFormatted: string;
    borrowApyVariable: number;
    borrowApyStable: number;
    totalSupply: string;
    totalSupplyUsd: number;
    availableLiquidity: string;
    availableLiquidityUsd: number;
    utilizationRate: number;
    ltv: number; // Loan to value ratio
    liquidationThreshold: number;
    canBeCollateral: boolean;
    canBeBorrowed: boolean;
    isActive: boolean;
    isFrozen: boolean;
}

export interface AaveUserPosition {
    chain: SupportedChain;
    asset: TokenInfo;
    supplied: string;
    suppliedFormatted: number;
    suppliedUsd: number;
    borrowed: string;
    borrowedFormatted: number;
    borrowedUsd: number;
    healthFactor?: number;
}

export interface AaveDepositParams {
    chain: SupportedChain;
    asset: string; // Token address
    amount: string;
    onBehalfOf?: string;
}

export interface AaveWithdrawParams {
    chain: SupportedChain;
    asset: string; // Token address
    amount: string; // Use max uint256 for full withdrawal
    to?: string;
}

export interface AaveOperationResult {
    success: boolean;
    txHash?: string;
    amount: string;
    asset: string;
    operation: 'deposit' | 'withdraw' | 'borrow' | 'repay';
    error?: string;
}

// ============================================================================
// Rebalancing Types
// ============================================================================

export interface PortfolioAllocation {
    token: TokenInfo;
    targetPercentage: number; // 0-100
    currentPercentage: number;
    currentValueUsd: number;
    targetValueUsd: number;
    differenceUsd: number;
}

export interface RebalanceStrategy {
    allocations: PortfolioAllocation[];
    chain: SupportedChain;
    totalValueUsd: number;
    swapsNeeded: RebalanceSwap[];
}

export interface RebalanceSwap {
    from: TokenInfo;
    to: TokenInfo;
    amountIn: string;
    estimatedAmountOut: string;
    valueUsd: number;
}

export interface RebalanceResult {
    success: boolean;
    swapsExecuted: SwapResult[];
    newAllocations: PortfolioAllocation[];
    errors: string[];
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface EVMManagerConfig {
    keystorePath: string;
    defaultChain: SupportedChain;
    rpcOverrides?: Partial<Record<SupportedChain, string>>;
    apiKeys?: {
        oneInch?: string;
        paraswap?: string;
        debank?: string;
        alchemy?: string;
        infura?: string;
    };
}

// ============================================================================
// Error Types
// ============================================================================

export class EVMManagerError extends Error {
    constructor(
        message: string,
        public code: string,
        public details?: any
    ) {
        super(message);
        this.name = 'EVMManagerError';
    }
}

export class InsufficientBalanceError extends EVMManagerError {
    constructor(token: string, required: string, available: string) {
        super(
            `Insufficient ${token} balance. Required: ${required}, Available: ${available}`,
            'INSUFFICIENT_BALANCE',
            { token, required, available }
        );
        this.name = 'InsufficientBalanceError';
    }
}

export class TransactionError extends EVMManagerError {
    constructor(message: string, txHash?: string, details?: any) {
        super(message, 'TRANSACTION_ERROR', { txHash, ...details });
        this.name = 'TransactionError';
    }
}
