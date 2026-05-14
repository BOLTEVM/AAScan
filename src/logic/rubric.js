import { config } from '../config';

export class Rubric {
  static evaluate(data) {
    const { volume, txCount, protocolAge, arbitrageProfit, adminKeyRenounced, isTransferable } = data;
    const { minVolume, minTxCount, minProtocolAgeDays, arbitrageProfitMargin, requireAdminRenounced, requireTransferable } = config.rubric;

    const results = {
      volumeMatch: volume >= minVolume,
      txCountMatch: txCount >= minTxCount,
      ageMatch: protocolAge >= minProtocolAgeDays,
      arbitrageMatch: arbitrageProfit >= arbitrageProfitMargin,
      adminMatch: adminKeyRenounced || !requireAdminRenounced,
      transferMatch: isTransferable || !requireTransferable,
    };

    // "All data must match x, y, or z for action"
    // Interpreting as: If any of these core metrics match, we flag it.
    // Or if it's a specific action type (e.g. Airdrop vs Arbitrage)
    
    const isAirdropOpportunity = results.volumeMatch && results.txCountMatch && results.ageMatch && results.adminMatch && results.transferMatch;
    const isArbitrageOpportunity = results.arbitrageMatch;

    return {
      success: isAirdropOpportunity || isArbitrageOpportunity,
      matches: results,
      summary: this.generateSummary(results, isAirdropOpportunity, isArbitrageOpportunity)
    };
  }

  static generateSummary(results, isAirdrop, isArb) {
    if (isArb) return "High-profit Flashloan Arbitrage detected!";
    if (isAirdrop) return "Protocol meets airdrop eligibility criteria.";
    
    const missing = [];
    if (!results.volumeMatch) missing.push("Volume");
    if (!results.txCountMatch) missing.push("Tx Count");
    if (!results.ageMatch) missing.push("Age");
    if (!results.adminMatch) missing.push("Admin Key Renounced");
    if (!results.transferMatch) missing.push("Transferable");
    
    return `Ineligible. Missing: ${missing.join(', ')}`;
  }
}
