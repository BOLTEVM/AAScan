export const config = {
  chains: [
    {
      name: 'Ethereum',
      rpc: import.meta.env.VITE_ETH_RPC || 'https://eth.llamarpc.com',
      id: 1,
    },
    {
      name: 'Arbitrum',
      rpc: import.meta.env.VITE_ARB_RPC || 'https://arbitrum.llamarpc.com',
      id: 42161,
    },
    {
      name: 'Polygon',
      rpc: import.meta.env.VITE_POLY_RPC || 'https://polygon.llamarpc.com',
      id: 137,
    },
    {
      name: 'Base',
      rpc: import.meta.env.VITE_BASE_RPC || 'https://base.llamarpc.com',
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
  }
};
