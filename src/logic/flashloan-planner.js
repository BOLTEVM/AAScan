import { Contract, Interface, ZeroAddress, formatUnits, getAddress } from 'ethers';
import { config } from '../config';

const BPS_DENOMINATOR = 10_000n;

const AAVE_POOL_ABI = [
  'function FLASHLOAN_PREMIUM_TOTAL() view returns (uint128)',
  'function flashLoanSimple(address receiverAddress,address asset,uint256 amount,bytes params,uint16 referralCode)'
];

const UNISWAP_V2_ROUTER_ABI = [
  'function getAmountsOut(uint256 amountIn,address[] calldata path) view returns (uint256[] memory amounts)'
];

const aavePoolInterface = new Interface(AAVE_POOL_ABI);

const toBps = (numerator, denominator) => {
  if (denominator === 0n) return 0;
  return Number((numerator * BPS_DENOMINATOR) / denominator);
};

const asAddress = (value) => {
  if (!value) return '';
  try {
    return getAddress(value);
  } catch {
    return '';
  }
};

export class FlashLoanPlanner {
  constructor(provider, chain, userAddress = null, options = {}) {
    this.provider = provider;
    this.chain = chain;
    this.userAddress = userAddress;
    this.options = { ...config.flashLoan, ...options };
  }

  async planBestRoute() {
    const routes = this.options.routes.filter(route => Number(route.chainId) === Number(this.chain.id));
    const poolAddress = asAddress(this.options.pools[this.chain.id]);
    const receiverAddress = asAddress(this.options.receiverAddress);

    const basePlan = {
      protocol: this.options.protocol,
      chainId: this.chain.id,
      chainName: this.chain.name,
      decision: 'blocked',
      integrity: 'fail-closed',
      reason: '',
      gates: [],
      quote: null,
      transaction: null,
    };

    if (!this.options.enabled) {
      return this.withGate(basePlan, 'suite-enabled', false, 'Flash-loan planning is disabled in config.');
    }

    if (!poolAddress) {
      return this.withGate(basePlan, 'pool-configured', false, 'No lending pool address is configured for this chain.');
    }

    if (!receiverAddress) {
      return this.withGate(basePlan, 'receiver-configured', false, 'No flash-loan receiver contract is configured.');
    }

    if (routes.length === 0) {
      return this.withGate(basePlan, 'route-configured', false, 'No flash-loan arbitrage route is configured for this chain.');
    }

    const premiumBps = await this.getPremiumBps(poolAddress);
    const candidates = [];

    for (const route of routes) {
      candidates.push(await this.planRoute(route, poolAddress, receiverAddress, premiumBps));
    }

    return candidates.sort((a, b) => (b.quote?.netProfitBps ?? -Infinity) - (a.quote?.netProfitBps ?? -Infinity))[0];
  }

  async planRoute(route, poolAddress, receiverAddress, premiumBps) {
    const gates = [];
    const amountIn = BigInt(route.amountRaw || 0);
    const decimals = Number(route.decimals ?? 18);
    const loanAsset = asAddress(route.loanAsset);
    const buyRouter = asAddress(route.buyRouter);
    const sellRouter = asAddress(route.sellRouter);
    const buyPath = (route.buyPath || []).map(asAddress);
    const sellPath = (route.sellPath || []).map(asAddress);

    const plan = {
      protocol: this.options.protocol,
      chainId: this.chain.id,
      chainName: this.chain.name,
      routeName: route.name || 'Unnamed route',
      decision: 'blocked',
      integrity: 'fail-closed',
      reason: '',
      gates,
      quote: null,
      transaction: null,
    };

    this.addGate(gates, 'loan-asset-valid', loanAsset !== '', 'Loan asset must be a valid token address.');
    this.addGate(gates, 'amount-valid', amountIn > 0n, 'Loan amount must be greater than zero.');
    this.addGate(gates, 'routers-valid', buyRouter !== '' && sellRouter !== '', 'Both quote routers must be valid addresses.');
    this.addGate(gates, 'paths-valid', buyPath.length >= 2 && sellPath.length >= 2, 'Both swap paths must include at least two tokens.');
    this.addGate(gates, 'round-trip-asset', buyPath[0] === loanAsset && sellPath[sellPath.length - 1] === loanAsset, 'Route must borrow and repay the same asset.');

    if (gates.some(gate => !gate.pass)) {
      return this.finalize(plan, 'blocked', 'Route configuration failed integrity checks.');
    }

    try {
      const buyAmounts = await this.quote(buyRouter, amountIn, buyPath);
      const targetAmount = buyAmounts[buyAmounts.length - 1];
      const sellAmounts = await this.quote(sellRouter, targetAmount, sellPath);
      const finalAmount = sellAmounts[sellAmounts.length - 1];
      const grossProfit = finalAmount - amountIn;
      const premium = (amountIn * BigInt(premiumBps)) / BPS_DENOMINATOR;
      const slippageReserve = (finalAmount * BigInt(this.options.maxSlippageBps)) / BPS_DENOMINATOR;
      const gasCost = await this.estimateGasCostInLoanAsset(route, loanAsset);
      const netProfit = grossProfit - premium - slippageReserve - (gasCost ?? 0n);
      const netProfitBps = toBps(netProfit, amountIn);
      const minProfit = (amountIn * BigInt(this.options.minNetProfitBps)) / BPS_DENOMINATOR;

      this.addGate(gates, 'quote-positive', finalAmount > amountIn, 'Round-trip quote must return more than borrowed.');
      this.addGate(gates, 'premium-covered', grossProfit > premium, 'Gross profit must cover flash-loan premium.');
      this.addGate(gates, 'gas-cost-accounted', gasCost !== null, 'Gas cost must be quoted or convertible into the borrowed asset.');
      this.addGate(gates, 'slippage-reserved', netProfit > 0n, 'Net profit must survive configured slippage reserve.');
      this.addGate(gates, 'minimum-profit', netProfit >= minProfit, 'Net profit must exceed minimum configured basis points.');

      plan.quote = {
        asset: loanAsset,
        decimals,
        amountIn: formatUnits(amountIn, decimals),
        finalAmount: formatUnits(finalAmount, decimals),
        grossProfit: formatUnits(grossProfit, decimals),
        premium: formatUnits(premium, decimals),
        slippageReserve: formatUnits(slippageReserve, decimals),
        gasCost: gasCost === null ? null : formatUnits(gasCost, decimals),
        netProfit: formatUnits(netProfit, decimals),
        premiumBps,
        netProfitBps,
      };

      if (gates.some(gate => !gate.pass)) {
        return this.finalize(plan, 'rejected', 'Quote failed profitability policy after fees and slippage.');
      }

      plan.transaction = this.buildAaveFlashLoanTransaction(poolAddress, receiverAddress, loanAsset, amountIn, route);
      this.addGate(gates, 'calldata-built', plan.transaction.data !== '0x', 'Aave flashLoanSimple calldata must be buildable.');

      const simulation = await this.simulate(plan.transaction);
      this.addGate(gates, 'eth-call-simulation', simulation.success, simulation.reason);
      plan.simulation = simulation;

      return this.finalize(
        plan,
        simulation.success ? 'ready' : 'simulation_failed',
        simulation.success ? 'Route passed quote, policy, calldata, and eth_call simulation checks.' : simulation.reason
      );
    } catch (error) {
      return this.finalize(plan, 'blocked', `Quote planning failed: ${error.message}`);
    }
  }

  async getPremiumBps(poolAddress) {
    try {
      const pool = new Contract(poolAddress, AAVE_POOL_ABI, this.provider);
      return Number(await pool.FLASHLOAN_PREMIUM_TOTAL());
    } catch {
      return Number(this.options.fallbackPremiumBps);
    }
  }

  async quote(routerAddress, amountIn, path) {
    const router = new Contract(routerAddress, UNISWAP_V2_ROUTER_ABI, this.provider);
    return router.getAmountsOut(amountIn, path);
  }

  async estimateGasCostInLoanAsset(route, loanAsset) {
    if (route.gasCostInLoanAssetRaw) {
      return BigInt(route.gasCostInLoanAssetRaw);
    }

    const feeData = await this.provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas;
    if (!gasPrice) return null;

    const nativeGasCost = BigInt(this.options.gasLimit) * gasPrice;
    const nativeWrappedAsset = asAddress(route.nativeWrappedAsset);
    if (nativeWrappedAsset && nativeWrappedAsset === loanAsset) {
      return nativeGasCost;
    }

    const gasQuoteRouter = asAddress(route.gasQuoteRouter);
    const gasPath = (route.nativeToLoanAssetPath || []).map(asAddress);
    if (gasQuoteRouter && gasPath.length >= 2 && gasPath[gasPath.length - 1] === loanAsset) {
      const amounts = await this.quote(gasQuoteRouter, nativeGasCost, gasPath);
      return amounts[amounts.length - 1];
    }

    return null;
  }

  buildAaveFlashLoanTransaction(poolAddress, receiverAddress, loanAsset, amountIn, route) {
    const params = route.params || '0x';
    return {
      to: poolAddress,
      from: this.userAddress || ZeroAddress,
      data: aavePoolInterface.encodeFunctionData('flashLoanSimple', [
        receiverAddress,
        loanAsset,
        amountIn,
        params,
        this.options.referralCode
      ]),
      value: '0x0'
    };
  }

  async simulate(transaction) {
    if (!this.userAddress) {
      return { success: false, reason: 'Simulation requires a connected wallet as the transaction sender.' };
    }

    try {
      await this.provider.call(transaction);
      return { success: true, reason: 'eth_call simulation completed without revert.' };
    } catch (error) {
      return { success: false, reason: `eth_call simulation reverted or failed: ${error.shortMessage || error.message}` };
    }
  }

  withGate(plan, name, pass, reason) {
    this.addGate(plan.gates, name, pass, reason);
    return this.finalize(plan, pass ? 'ready' : 'blocked', reason);
  }

  addGate(gates, name, pass, reason) {
    gates.push({ name, pass, reason });
  }

  finalize(plan, decision, reason) {
    return {
      ...plan,
      decision,
      reason,
      integrity: plan.gates.every(gate => gate.pass) ? 'high' : 'fail-closed',
    };
  }
}
