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
  }
};
