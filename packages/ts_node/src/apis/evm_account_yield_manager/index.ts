/**
 * EVM Account Yield Manager
 *
 * A comprehensive system for managing EVM-compatible accounts (Ethereum, BSC, Arbitrum, Base)
 * with secure private key storage, token balance tracking, swap/rebalancing functionality,
 * and AAVE yield management.
 *
 * @example
 * ```typescript
 * import { evm_account_yield_manager as evm } from 'tidyscripts_node/apis';
 *
 * // Initialize the manager
 * const manager = evm.createManager({
 *   keystorePath: './keystore',
 *   defaultChain: 'ethereum',
 *   apiKeys: {
 *     oneInch: 'your-api-key'
 *   }
 * });
 *
 * // Import an account
 * await manager.importAccount('0x...privatekey', 'mypassword', 'Main Wallet');
 *
 * // Get token balances
 * const balances = await manager.getBalances('0x...address', 'ethereum');
 *
 * // Get AAVE yield opportunities
 * const yields = await manager.getYieldOpportunities('ethereum');
 *
 * // Deposit to AAVE
 * const depositTx = manager.buildAaveDeposit({
 *   chain: 'ethereum',
 *   asset: '0x...USDC',
 *   amount: '1000000000' // 1000 USDC
 * });
 * ```
 */

// ============================================================================
// Type Exports
// ============================================================================

export * from './types';

// ============================================================================
// Module Exports
// ============================================================================

export * from './chains';
export * from './secure_storage';
export * from './balances';
export * from './swap';
export * from './aave';

// ============================================================================
// Imports for Manager
// ============================================================================

import {
    SupportedChain,
    EVMAccount,
    TokenBalance,
    SwapParams,
    SwapQuote,
    AaveYieldOpportunity,
    AaveUserPosition,
    AaveDepositParams,
    AaveWithdrawParams,
    EVMManagerConfig,
    EVMManagerError,
    PortfolioAllocation,
    RebalanceStrategy,
} from './types';

import {
    CHAIN_CONFIGS,
    COMMON_TOKENS,
    getChainConfig,
    getSupportedChains,
    getTokenAddress,
} from './chains';

import { KeystoreManager, getKeystoreManager } from './secure_storage';
import { BalanceService, getBalanceService } from './balances';
import { SwapService, RebalanceService, getSwapService, getRebalanceService } from './swap';
import { AaveService, getAaveService } from './aave';

// ============================================================================
// Unified Manager Class
// ============================================================================

/**
 * EVMAccountYieldManager - Unified interface for all EVM account operations
 */
export class EVMAccountYieldManager {
    private config: EVMManagerConfig;
    private keystore: KeystoreManager;
    private balanceService: BalanceService;
    private swapService: SwapService;
    private rebalanceService: RebalanceService;
    private aaveService: AaveService;

    constructor(config: EVMManagerConfig) {
        this.config = config;
        this.keystore = getKeystoreManager(config);
        this.balanceService = getBalanceService(config);
        this.swapService = getSwapService(config);
        this.rebalanceService = getRebalanceService(config);
        this.aaveService = getAaveService(config);
    }

    // ========================================================================
    // Account Management
    // ========================================================================

    /**
     * Import an account from a private key
     */
    async importAccount(
        privateKey: string,
        password: string,
        nickname?: string
    ): Promise<EVMAccount> {
        return this.keystore.importAccount(privateKey, password, nickname);
    }

    /**
     * Generate a new random account
     */
    async generateAccount(password: string, nickname?: string): Promise<EVMAccount> {
        return this.keystore.generateAccount(password, nickname);
    }

    /**
     * List all managed accounts
     */
    listAccounts(): EVMAccount[] {
        return this.keystore.listAccounts();
    }

    /**
     * Check if an account exists
     */
    hasAccount(address: string): boolean {
        return this.keystore.hasAccount(address);
    }

    /**
     * Remove an account (requires password verification)
     */
    removeAccount(address: string, password: string): boolean {
        return this.keystore.removeAccount(address, password);
    }

    /**
     * Export encrypted keystore
     */
    async exportKeystore(
        address: string,
        password: string,
        exportPassword: string
    ): Promise<string> {
        return this.keystore.exportKeystore(address, password, exportPassword);
    }

    /**
     * Change account password
     */
    async changePassword(
        address: string,
        oldPassword: string,
        newPassword: string
    ): Promise<void> {
        return this.keystore.changePassword(address, oldPassword, newPassword);
    }

    /**
     * Get private key (for signing - handle with care!)
     */
    async getPrivateKey(address: string, password: string): Promise<string> {
        return this.keystore.getPrivateKey(address, password);
    }

    // ========================================================================
    // Balance Operations
    // ========================================================================

    /**
     * Get native token balance
     */
    async getNativeBalance(address: string, chain: SupportedChain) {
        return this.balanceService.getNativeBalance(address, chain);
    }

    /**
     * Get specific token balance
     */
    async getTokenBalance(
        address: string,
        tokenAddress: string,
        chain: SupportedChain
    ): Promise<TokenBalance> {
        return this.balanceService.getTokenBalance(address, tokenAddress, chain);
    }

    /**
     * Get all common token balances for an address on a chain
     */
    async getBalances(address: string, chain: SupportedChain): Promise<TokenBalance[]> {
        return this.balanceService.getAllCommonTokenBalances(address, chain);
    }

    /**
     * Get portfolio value across all supported chains
     */
    async getPortfolio(
        address: string,
        chains?: SupportedChain[]
    ): Promise<{
        totalValueUsd: number;
        byChain: Record<SupportedChain, { balances: TokenBalance[]; totalUsd: number }>;
    }> {
        return this.balanceService.getPortfolioAcrossChains(address, chains);
    }

    /**
     * Get token price in USD
     */
    async getTokenPrice(tokenAddress: string, chain: SupportedChain): Promise<number> {
        return this.balanceService.getTokenPrice(tokenAddress, chain);
    }

    // ========================================================================
    // Swap Operations
    // ========================================================================

    /**
     * Get swap quote from best aggregator
     */
    async getSwapQuote(params: SwapParams): Promise<SwapQuote> {
        return this.swapService.getBestQuote(params);
    }

    /**
     * Get swap quote specifically from 1inch
     */
    async getSwapQuoteOneInch(params: SwapParams): Promise<SwapQuote> {
        return this.swapService.getQuoteOneInch(params);
    }

    /**
     * Get swap quote specifically from Paraswap
     */
    async getSwapQuoteParaswap(params: SwapParams): Promise<SwapQuote> {
        return this.swapService.getQuoteParaswap(params);
    }

    /**
     * Build swap transaction data
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
        return this.swapService.buildSwapTransaction(params, fromAddress);
    }

    /**
     * Check token allowance for swap router
     */
    async checkSwapAllowance(
        tokenAddress: string,
        ownerAddress: string,
        chain: SupportedChain
    ): Promise<bigint> {
        const routerAddress = this.swapService.getOneInchRouterAddress(chain);
        return this.swapService.checkAllowance(
            tokenAddress,
            ownerAddress,
            routerAddress,
            chain
        );
    }

    /**
     * Build approval transaction for swap
     */
    buildSwapApproval(
        tokenAddress: string,
        chain: SupportedChain,
        amount?: string
    ): { to: string; data: string } {
        const routerAddress = this.swapService.getOneInchRouterAddress(chain);
        return this.swapService.buildApprovalTransaction(tokenAddress, routerAddress, amount);
    }

    // ========================================================================
    // Rebalancing Operations
    // ========================================================================

    /**
     * Calculate rebalancing strategy
     */
    async calculateRebalanceStrategy(
        address: string,
        chain: SupportedChain,
        targetAllocations: { tokenAddress: string; targetPercentage: number }[]
    ): Promise<RebalanceStrategy> {
        return this.rebalanceService.calculateRebalanceStrategy(
            address,
            chain,
            targetAllocations
        );
    }

    /**
     * Get quotes for rebalancing swaps
     */
    async getRebalanceQuotes(
        strategy: RebalanceStrategy,
        slippageTolerance?: number
    ): Promise<SwapQuote[]> {
        return this.rebalanceService.getRebalanceQuotes(strategy, slippageTolerance);
    }

    // ========================================================================
    // AAVE Operations
    // ========================================================================

    /**
     * Get all AAVE yield opportunities on a chain
     */
    async getYieldOpportunities(chain: SupportedChain): Promise<AaveYieldOpportunity[]> {
        return this.aaveService.getYieldOpportunities(chain);
    }

    /**
     * Get top yield opportunities sorted by APY
     */
    async getTopYieldOpportunities(
        chain: SupportedChain,
        limit?: number
    ): Promise<AaveYieldOpportunity[]> {
        return this.aaveService.getTopYieldOpportunities(chain, limit);
    }

    /**
     * Get yield opportunities across all supported chains
     */
    async getYieldOpportunitiesAllChains(): Promise<
        Record<SupportedChain, AaveYieldOpportunity[]>
    > {
        return this.aaveService.getYieldOpportunitiesAllChains();
    }

    /**
     * Find best yield for a specific asset across chains
     */
    async getBestYieldForAsset(
        symbol: string
    ): Promise<{ chain: SupportedChain; opportunity: AaveYieldOpportunity } | null> {
        return this.aaveService.getBestYieldForAsset(symbol);
    }

    /**
     * Get user's AAVE positions
     */
    async getAavePositions(
        address: string,
        chain: SupportedChain
    ): Promise<AaveUserPosition[]> {
        return this.aaveService.getUserPositions(address, chain);
    }

    /**
     * Get user's overall AAVE account data
     */
    async getAaveAccountData(
        address: string,
        chain: SupportedChain
    ): Promise<{
        totalCollateralUsd: number;
        totalDebtUsd: number;
        availableBorrowsUsd: number;
        currentLiquidationThreshold: number;
        ltv: number;
        healthFactor: number;
    }> {
        return this.aaveService.getUserAccountData(address, chain);
    }

    /**
     * Build AAVE deposit transaction
     */
    buildAaveDeposit(params: AaveDepositParams): {
        to: string;
        data: string;
        value: string;
    } {
        return this.aaveService.buildDepositTransaction(params);
    }

    /**
     * Build AAVE withdraw transaction
     */
    buildAaveWithdraw(params: AaveWithdrawParams): {
        to: string;
        data: string;
    } {
        return this.aaveService.buildWithdrawTransaction(params);
    }

    /**
     * Build approval for AAVE deposit
     */
    buildAaveApproval(
        tokenAddress: string,
        chain: SupportedChain,
        amount?: string
    ): { to: string; data: string } {
        return this.aaveService.buildApprovalForDeposit(tokenAddress, chain, amount);
    }

    /**
     * Check approval for AAVE deposit
     */
    async checkAaveApproval(
        tokenAddress: string,
        ownerAddress: string,
        chain: SupportedChain
    ): Promise<bigint> {
        return this.aaveService.checkApprovalForDeposit(tokenAddress, ownerAddress, chain);
    }

    // ========================================================================
    // Utility Methods
    // ========================================================================

    /**
     * Get chain configuration
     */
    getChainConfig(chain: SupportedChain) {
        return getChainConfig(chain);
    }

    /**
     * Get all supported chains
     */
    getSupportedChains(): SupportedChain[] {
        return getSupportedChains();
    }

    /**
     * Get common token address for a chain
     */
    getTokenAddress(chain: SupportedChain, symbol: string): string | undefined {
        return getTokenAddress(chain, symbol);
    }

    /**
     * Get all common tokens for a chain
     */
    getCommonTokens(chain: SupportedChain): Record<string, string> {
        return COMMON_TOKENS[chain];
    }
}

// ============================================================================
// Factory Function
// ============================================================================

let managerInstance: EVMAccountYieldManager | null = null;

/**
 * Create or get the EVM Account Yield Manager instance
 *
 * @example
 * ```typescript
 * const manager = createManager({
 *   keystorePath: './my-keystore',
 *   defaultChain: 'arbitrum',
 *   apiKeys: {
 *     oneInch: 'your-1inch-api-key'
 *   }
 * });
 * ```
 */
export function createManager(config: EVMManagerConfig): EVMAccountYieldManager {
    if (!managerInstance) {
        managerInstance = new EVMAccountYieldManager(config);
    }
    return managerInstance;
}

/**
 * Get existing manager instance (throws if not initialized)
 */
export function getManager(): EVMAccountYieldManager {
    if (!managerInstance) {
        throw new EVMManagerError(
            'Manager not initialized. Call createManager() first.',
            'NOT_INITIALIZED'
        );
    }
    return managerInstance;
}

/**
 * Reset manager instance (for testing)
 */
export function resetManager(): void {
    managerInstance = null;
}

// ============================================================================
// Default Export
// ============================================================================

export default {
    createManager,
    getManager,
    resetManager,
    EVMAccountYieldManager,
    CHAIN_CONFIGS,
    COMMON_TOKENS,
    getChainConfig,
    getSupportedChains,
    getTokenAddress,
};
