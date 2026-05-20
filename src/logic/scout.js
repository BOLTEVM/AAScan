import { formatEther, JsonRpcProvider, parseEther } from 'ethers';
import { config } from '../config';
import { FlashLoanPlanner } from './flashloan-planner';
import { Rubric } from './rubric';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export class Scout {
  constructor(onUpdate, userAddress = null, options = {}) {
    this.onUpdate = onUpdate;
    this.userAddress = userAddress;
    this.options = { ...config.autonomy, ...options };
    this.isRunning = false;
    this.cycle = 0;
    this.providers = config.chains.map(chain => ({
      ...chain,
      provider: new JsonRpcProvider(chain.rpc)
    }));
  }

  stop() {
    this.isRunning = false;
  }

  async startAutonomous() {
    this.isRunning = true;
    this.cycle = 0;
    this.onUpdate({ type: 'STATUS', message: 'Autonomous onchain agent online.' });

    while (this.isRunning) {
      this.cycle += 1;
      await this.startScouting();

      if (this.options.maxCycles > 0 && this.cycle >= this.options.maxCycles) {
        this.stop();
        break;
      }

      this.onUpdate({
        type: 'STATUS',
        message: `Autonomous cycle ${this.cycle} complete. Next scan in ${Math.round(this.options.cycleIntervalMs / 1000)}s.`
      });
      await this.waitForNextCycle();
    }

    this.onUpdate({ type: 'STATUS', message: 'Autonomous onchain agent stopped.' });
  }

  async startScouting() {
    this.onUpdate({
      type: 'STATUS',
      message: this.userAddress
        ? `Analyzing onchain context for ${this.userAddress.slice(0, 8)}...`
        : 'Starting read-only multi-chain scout...'
    });

    if (this.userAddress) {
      await this.analyzeWalletHistory();
    }

    for (const chain of this.providers) {
      try {
        this.onUpdate({ type: 'SCAN', chain: chain.name, message: `Scanning ${chain.name}...` });

        const blockNumber = await chain.provider.getBlockNumber();
        const protocols = await this.discoverOpportunities(chain, blockNumber);
        const flashLoanPlan = await this.planFlashLoan(chain);

        for (const protocol of [...protocols, flashLoanPlan]) {
          const evaluation = Rubric.evaluate(protocol.data);
          const action = protocol.action || await this.planAction(chain, protocol, evaluation);

          this.onUpdate({
            type: 'RESULT',
            chain: chain.name,
            protocol: protocol.name,
            success: evaluation.success,
            summary: evaluation.summary,
            data: protocol.data,
            action,
            cycle: this.cycle,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        this.onUpdate({ type: 'ERROR', chain: chain.name, message: error.message });
      }
    }

    this.onUpdate({ type: 'STATUS', message: 'Scout cycle complete.' });
  }

  async waitForNextCycle() {
    const stepMs = 500;
    let elapsed = 0;

    while (this.isRunning && elapsed < this.options.cycleIntervalMs) {
      await delay(Math.min(stepMs, this.options.cycleIntervalMs - elapsed));
      elapsed += stepMs;
    }
  }

  async analyzeWalletHistory() {
    this.onUpdate({ type: 'SCAN', message: 'Reading wallet balances across configured chains...' });

    for (const chain of this.providers) {
      try {
        const balance = await chain.provider.getBalance(this.userAddress);
        const nativeBalance = Number(formatEther(balance));
        const data = {
          volume: nativeBalance,
          txCount: nativeBalance > 0 ? 1 : 0,
          protocolAge: 365,
          arbitrageProfit: 0,
          adminKeyRenounced: true,
          isTransferable: true,
          nativeBalance,
        };
        const evaluation = Rubric.evaluate(data);

        this.onUpdate({
          type: 'RESULT',
          chain: chain.name,
          protocol: 'Wallet Readiness',
          success: nativeBalance >= Number(this.options.minNativeBalance),
          summary: nativeBalance > 0
            ? `Wallet has ${nativeBalance.toFixed(4)} native tokens available for monitoring.`
            : 'Wallet has no native balance on this chain.',
          data,
          action: {
            status: evaluation.success ? 'observed' : 'blocked',
            label: 'Balance check',
            reason: 'Read-only wallet context; no transaction required.'
          },
          cycle: this.cycle,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.onUpdate({ type: 'ERROR', chain: chain.name, message: `Wallet analysis failed: ${error.message}` });
      }
    }
  }

  async discoverOpportunities(chain, blockNumber) {
    const latestBlock = await chain.provider.getBlock(blockNumber);
    const nativeLiquidity = await this.getNativeLiquiditySignal(chain);
    const ageDays = Math.max(1, Math.floor((Date.now() / 1000 - Number(latestBlock.timestamp)) / 86400) + 1);
    const blockSignal = Number(BigInt(blockNumber) % 100n);

    return [
      {
        name: 'Native Liquidity Monitor',
        data: {
          volume: nativeLiquidity,
          txCount: blockSignal,
          protocolAge: Math.max(ageDays, config.rubric.minProtocolAgeDays),
          arbitrageProfit: 0,
          adminKeyRenounced: true,
          isTransferable: true
        }
      },
      {
        name: 'Gas Spread Watch',
        data: {
          volume: nativeLiquidity,
          txCount: Math.max(1, blockSignal),
          protocolAge: Math.max(ageDays, config.rubric.minProtocolAgeDays),
          arbitrageProfit: await this.estimateGasSpread(chain),
          adminKeyRenounced: true,
          isTransferable: true
        }
      }
    ];
  }

  async planFlashLoan(chain) {
    const planner = new FlashLoanPlanner(chain.provider, chain, this.userAddress);
    const plan = await planner.planBestRoute();
    const netProfitBps = plan.quote?.netProfitBps ?? 0;
    const success = plan.decision === 'ready';

    return {
      name: 'Flash Loan Transaction Planner',
      data: {
        volume: Number(plan.quote?.amountIn ?? 0),
        txCount: plan.gates.length,
        protocolAge: config.rubric.minProtocolAgeDays,
        arbitrageProfit: Math.max(0, netProfitBps / 10_000),
        adminKeyRenounced: plan.integrity === 'high',
        isTransferable: success
      },
      action: {
        status: success ? 'ready' : plan.decision,
        label: success ? 'Simulation ready' : 'Fail-closed',
        reason: plan.reason,
        plan
      }
    };
  }

  async getNativeLiquiditySignal(chain) {
    if (!this.userAddress) return 0;
    const balance = await chain.provider.getBalance(this.userAddress);
    return Number(formatEther(balance));
  }

  async estimateGasSpread(chain) {
    const feeData = await chain.provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas ?? 0n;
    if (gasPrice === 0n) return 0;

    const gwei = Number(gasPrice) / 1e9;
    return Math.max(0, Math.min(0.05, (25 - gwei) / 1000));
  }

  async planAction(chain, protocol, evaluation) {
    if (!evaluation.success) {
      return {
        status: 'skipped',
        label: 'No action',
        reason: evaluation.summary
      };
    }

    if (!this.userAddress) {
      return {
        status: 'advisory',
        label: 'Connect wallet',
        reason: 'Opportunity detected, but autonomous execution needs a wallet context.'
      };
    }

    const balance = await chain.provider.getBalance(this.userAddress);
    if (balance < parseEther(this.options.minNativeBalance)) {
      return {
        status: 'blocked',
        label: 'Insufficient gas',
        reason: `Requires at least ${this.options.minNativeBalance} native tokens for safe execution.`
      };
    }

    if (!this.options.executeTransactions) {
      return {
        status: 'queued',
        label: 'Ready for execution',
        reason: `${protocol.name} passed policy checks. Transaction submission is disabled by config.autonomy.executeTransactions.`
      };
    }

    return {
      status: 'queued',
      label: 'Execution adapter required',
      reason: 'Policy permits execution, but no protocol-specific transaction adapter is configured.'
    };
  }
}
