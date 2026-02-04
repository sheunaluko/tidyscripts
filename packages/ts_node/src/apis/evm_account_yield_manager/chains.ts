/**
 * EVM Account Yield Manager - Chain Configuration
 *
 * Multi-chain support for Ethereum, BSC, Arbitrum, and Base
 */

import { ChainConfig, SupportedChain } from './types';

// ============================================================================
// Chain Configurations
// ============================================================================

export const CHAIN_CONFIGS: Record<SupportedChain, ChainConfig> = {
    ethereum: {
        chainId: 1,
        name: 'Ethereum Mainnet',
        shortName: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        explorerUrl: 'https://etherscan.io',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
        },
        aavePoolAddress: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
        aavePoolDataProvider: '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3',
        wrappedNativeToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    },
    bsc: {
        chainId: 56,
        name: 'BNB Smart Chain',
        shortName: 'bsc',
        rpcUrl: 'https://bsc-dataseed.binance.org',
        explorerUrl: 'https://bscscan.com',
        nativeCurrency: {
            name: 'BNB',
            symbol: 'BNB',
            decimals: 18,
        },
        aavePoolAddress: '0x6807dc923806fE8Fd134338EABCA509979a7e0cB',
        aavePoolDataProvider: '0x41585C50524fb8c3899B43D7D797d9486AAc94DB',
        wrappedNativeToken: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
    },
    arbitrum: {
        chainId: 42161,
        name: 'Arbitrum One',
        shortName: 'arbitrum',
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        explorerUrl: 'https://arbiscan.io',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
        },
        aavePoolAddress: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
        aavePoolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
        wrappedNativeToken: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
    },
    base: {
        chainId: 8453,
        name: 'Base',
        shortName: 'base',
        rpcUrl: 'https://mainnet.base.org',
        explorerUrl: 'https://basescan.org',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
        },
        aavePoolAddress: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
        aavePoolDataProvider: '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac',
        wrappedNativeToken: '0x4200000000000000000000000000000000000006', // WETH
    },
};

// ============================================================================
// Common Token Addresses
// ============================================================================

export const COMMON_TOKENS: Record<SupportedChain, Record<string, string>> = {
    ethereum: {
        USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        DAI: '0x6B175474E89094C44Da98b954EescdeCB5BE3830',
        WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
        WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        AAVE: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
        LINK: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    },
    bsc: {
        USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        USDT: '0x55d398326f99059fF775485246999027B3197955',
        DAI: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
        WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        BTCB: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
        ETH: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
    },
    arbitrum: {
        USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        'USDC.e': '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
        USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
        WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
        WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    },
    base: {
        USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
        DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
        WETH: '0x4200000000000000000000000000000000000006',
        cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
    },
};

// ============================================================================
// AAVE V3 Contract ABIs (minimal)
// ============================================================================

export const AAVE_POOL_ABI = [
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
    'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external',
    'function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) external returns (uint256)',
    'function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
    'function getReserveData(address asset) external view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))',
];

export const AAVE_DATA_PROVIDER_ABI = [
    'function getAllReservesTokens() external view returns (tuple(string symbol, address tokenAddress)[])',
    'function getReserveConfigurationData(address asset) external view returns (uint256 decimals, uint256 ltv, uint256 liquidationThreshold, uint256 liquidationBonus, uint256 reserveFactor, bool usageAsCollateralEnabled, bool borrowingEnabled, bool stableBorrowRateEnabled, bool isActive, bool isFrozen)',
    'function getReserveData(address asset) external view returns (uint256 unbacked, uint256 accruedToTreasuryScaled, uint256 totalAToken, uint256 totalStableDebt, uint256 totalVariableDebt, uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 averageStableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex, uint40 lastUpdateTimestamp)',
    'function getUserReserveData(address asset, address user) external view returns (uint256 currentATokenBalance, uint256 currentStableDebt, uint256 currentVariableDebt, uint256 principalStableDebt, uint256 scaledVariableDebt, uint256 stableBorrowRate, uint256 liquidityRate, uint40 stableRateLastUpdated, bool usageAsCollateralEnabled)',
    'function getReserveTokensAddresses(address asset) external view returns (address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress)',
];

export const ERC20_ABI = [
    'function name() external view returns (string)',
    'function symbol() external view returns (string)',
    'function decimals() external view returns (uint8)',
    'function balanceOf(address account) external view returns (uint256)',
    'function allowance(address owner, address spender) external view returns (uint256)',
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function transfer(address to, uint256 amount) external returns (bool)',
    'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
    'event Transfer(address indexed from, address indexed to, uint256 value)',
    'event Approval(address indexed owner, address indexed spender, uint256 value)',
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get chain configuration by chain ID
 */
export function getChainConfigByChainId(chainId: number): ChainConfig | undefined {
    return Object.values(CHAIN_CONFIGS).find((config) => config.chainId === chainId);
}

/**
 * Get chain configuration by name
 */
export function getChainConfig(chain: SupportedChain): ChainConfig {
    return CHAIN_CONFIGS[chain];
}

/**
 * Check if a chain is supported
 */
export function isSupportedChain(chain: string): chain is SupportedChain {
    return chain in CHAIN_CONFIGS;
}

/**
 * Get all supported chain names
 */
export function getSupportedChains(): SupportedChain[] {
    return Object.keys(CHAIN_CONFIGS) as SupportedChain[];
}

/**
 * Get common token address for a chain
 */
export function getTokenAddress(
    chain: SupportedChain,
    symbol: string
): string | undefined {
    return COMMON_TOKENS[chain]?.[symbol.toUpperCase()];
}

/**
 * Check if address is native token placeholder
 */
export function isNativeToken(address: string): boolean {
    return (
        address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' ||
        address.toLowerCase() === '0x0000000000000000000000000000000000000000'
    );
}

/**
 * Get wrapped native token for a chain
 */
export function getWrappedNativeToken(chain: SupportedChain): string {
    return CHAIN_CONFIGS[chain].wrappedNativeToken;
}
