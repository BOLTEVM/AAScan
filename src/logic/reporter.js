export class Reporter {
  static generateReport(results) {
    const timestamp = new Date().toLocaleString();
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    let report = '# Airdrop Agent Scouting Report\n\n';
    report += `**Generated:** ${timestamp}\n`;
    report += `**Total Scanned:** ${results.length}\n`;
    report += `**Opportunities Found:** ${successCount}\n`;
    report += `**Ineligible:** ${failureCount}\n\n`;

    report += '## Detailed Breakdown\n\n';

    results.forEach(res => {
      const status = res.success ? 'SUCCESS' : 'FAILED';
      report += `### [${res.chain}] ${res.protocol}\n`;
      report += `- **Status:** ${status}\n`;
      report += `- **Summary:** ${res.summary}\n`;
      report += `- **Metrics:** Vol: ${res.data.volume.toFixed(2)}, Txs: ${res.data.txCount}, Age: ${res.data.protocolAge}d, Arb: ${(res.data.arbitrageProfit * 100).toFixed(2)}%\n`;
      report += `- **Security:** Admin Renounced: ${res.data.adminKeyRenounced ? 'yes' : 'no'}, Transferable: ${res.data.isTransferable ? 'yes' : 'no'}\n`;
      if (res.action) {
        report += `- **Action:** ${res.action.label} (${res.action.status}) - ${res.action.reason}\n`;
      }
      report += '\n';
    });

    return report;
  }

  static downloadReport(results) {
    const content = this.generateReport(results);
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scout-report-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
