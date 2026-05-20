const ankrApiKey = import.meta.env.VITE_ANKR_API_KEY;
const ankrRpc = (network) => ankrApiKey
  ? `https://rpc.ankr.com/${network}/${ankrApiKey}`
  : `https://rpc.ankr.com/${network}`;

export const config = {
  chains: [
    {
      name: 'Ethereum',
      rpc: import.meta.env.VITE_ETH_RPC || ankrRpc('eth'),
      id: 1,
    },
    {
      name: 'Arbitrum',
      rpc: import.meta.env.VITE_ARB_RPC || ankrRpc('arbitrum'),
      id: 42161,
    },
    {
      name: 'Polygon',
      rpc: import.meta.env.VITE_POLY_RPC || ankrRpc('polygon'),
      id: 137,
    },
    {
      name: 'Base',
      rpc: import.meta.env.VITE_BASE_RPC || ankrRpc('base'),
      id: 8453,
    }
  ],
  rubric: {
    minVolume: 1000, // x
    minTxCount: 50,  // y
    minProtocolAgeDays: 30, // z
    arbitrageProfitMargin: 0.02, // 2%
    requireAdminRenounced: true,
    requireTransferable: true,
  },
  autonomy: {
    enabledByDefault: false,
    cycleIntervalMs: 60_000,
    maxCycles: 0,
    maxResults: 250,
    executeTransactions: false,
    minNativeBalance: '0.01',
  },
  flashLoan: {
    enabled: true,
    protocol: 'AAVE_V3',
    receiverAddress: import.meta.env.VITE_FLASH_LOAN_RECEIVER || '',
    referralCode: Number(import.meta.env.VITE_FLASH_LOAN_REFERRAL_CODE || 0),
    fallbackPremiumBps: Number(import.meta.env.VITE_FLASH_LOAN_PREMIUM_BPS || 9),
    minNetProfitBps: Number(import.meta.env.VITE_FLASH_LOAN_MIN_NET_PROFIT_BPS || 25),
    maxSlippageBps: Number(import.meta.env.VITE_FLASH_LOAN_MAX_SLIPPAGE_BPS || 30),
    gasLimit: BigInt(import.meta.env.VITE_FLASH_LOAN_GAS_LIMIT || 650000),
    pools: {
      1: import.meta.env.VITE_AAVE_V3_POOL_ETH || '',
      42161: import.meta.env.VITE_AAVE_V3_POOL_ARB || '',
      137: import.meta.env.VITE_AAVE_V3_POOL_POLY || '',
      8453: import.meta.env.VITE_AAVE_V3_POOL_BASE || '',
    },
    routes: []
  }
};
