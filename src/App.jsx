import { useState, useEffect, useRef } from 'react';
import { Scout } from './logic/scout';
import { Reporter } from './logic/reporter';
import { config } from './config';
import { Shield, Target, Zap, FileText, Activity, Bot, PauseCircle } from 'lucide-react';
import './styles.css';

function App() {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('Idle');
  const [isScanning, setIsScanning] = useState(false);
  const [isAutonomous, setIsAutonomous] = useState(config.autonomy.enabledByDefault);
  const [results, setResults] = useState([]);
  const [account, setAccount] = useState(null);
  const logEndRef = useRef(null);
  const scoutRef = useRef(null);

  const scrollToBottom = () => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  useEffect(() => () => {
    scoutRef.current?.stop();
  }, []);

  const handleUpdate = (update) => {
    const timestamp = new Date().toLocaleTimeString();

    if (update.type === 'STATUS') {
      setStatus(update.message);
      setLogs(prev => [...prev, { ...update, timestamp }]);
    } else if (update.type === 'RESULT') {
      setResults(prev => [update, ...prev].slice(0, config.autonomy.maxResults));
      setLogs(prev => [...prev, { 
        ...update, 
        timestamp,
        type: update.success ? 'success' : 'error',
        message: `[${update.chain}] ${update.protocol}: ${update.summary} (${update.action?.label || 'No action'})`
      }]);
    } else {
      setLogs(prev => [...prev, { ...update, timestamp, message: update.message || `Scanning ${update.chain}...` }]);
    }
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
        setLogs(prev => [...prev, { type: 'success', timestamp: new Date().toLocaleTimeString(), message: `Wallet connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}` }]);
      } catch (error) {
        setLogs(prev => [...prev, { type: 'error', timestamp: new Date().toLocaleTimeString(), message: `Connection failed: ${error.message}` }]);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  const startScout = async () => {
    setIsScanning(true);
    const scout = new Scout(handleUpdate, account, { maxCycles: 1 });
    scoutRef.current = scout;
    await scout.startScouting();
    setIsScanning(false);
  };

  const toggleAutonomy = async () => {
    if (isAutonomous) {
      scoutRef.current?.stop();
      scoutRef.current = null;
      setIsAutonomous(false);
      setIsScanning(false);
      handleUpdate({ type: 'STATUS', message: 'Autonomous mode stopping after current operation.' });
      return;
    }

    setIsAutonomous(true);
    setIsScanning(true);
    const scout = new Scout(handleUpdate, account);
    scoutRef.current = scout;
    await scout.startAutonomous();
    setIsAutonomous(false);
    setIsScanning(false);
  };

  const downloadReport = () => {
    if (results.length > 0) {
      Reporter.downloadReport(results);
    }
  };

  return (
    <div className="container">
      <header>
        <img src="/0logov3.png" alt="Logo" className="hero-logo" />
        <h1>B-Agent Airdrop</h1>
        <p className="subtitle">Multi-Chain Scouting & Flashloan Arbitrage Engine</p>
      </header>

      <main className="dashboard-grid">
        <aside className="panel stats-card">
          <div className="stat-item">
            <span><Shield size={20} color="var(--accent)" /> Engine Status</span>
            <span className="stat-value" style={{ fontSize: '1rem', color: isScanning ? 'var(--success)' : 'var(--text-secondary)' }}>
              {isAutonomous ? 'AUTO' : isScanning ? 'ACTIVE' : 'IDLE'}
            </span>
          </div>
          <div className="stat-item">
            <span><Target size={20} color="var(--accent)" /> Scanned</span>
            <span className="stat-value">{results.length}</span>
          </div>
          <div className="stat-item">
            <span><Zap size={20} color="var(--success)" /> Opportunities</span>
            <span className="stat-value" style={{ color: 'var(--success)' }}>
              {results.filter(r => r.success).length}
            </span>
          </div>
          <div className="stat-item">
            <span><Activity size={20} color="var(--accent)" /> Active Chains</span>
            <span className="stat-value">{config.chains.length}</span>
          </div>
          <div className="stat-item">
            <span><Bot size={20} color="var(--accent)" /> Action Policy</span>
            <span className="stat-value" style={{ fontSize: '0.9rem' }}>
              {config.autonomy.executeTransactions ? 'EXECUTE' : 'QUEUE'}
            </span>
          </div>
          
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {!account ? (
              <button className="btn" onClick={connectWallet} style={{ width: '100%' }}>
                Connect Wallet
              </button>
            ) : (
              <div className="stat-item" style={{ border: '1px solid var(--accent)', borderRadius: '8px', padding: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>{account.slice(0, 6)}...{account.slice(-4)}</span>
              </div>
            )}

            <button 
              className="btn" 
              onClick={startScout} 
              disabled={isScanning}
              style={{ width: '100%' }}
            >
              {isScanning ? (account ? 'Analyzing Wallet...' : 'Scouting...') : (account ? 'Run One Cycle' : 'Scout Once')}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={toggleAutonomy}
              style={{ width: '100%', marginLeft: 0 }}
            >
              {isAutonomous ? (
                <>
                  <PauseCircle size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                  Stop Autonomy
                </>
              ) : (
                <>
                  <Bot size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                  Start Autonomy
                </>
              )}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={downloadReport} 
              disabled={results.length === 0}
              style={{ width: '100%', marginLeft: 0, marginTop: '1rem' }}
            >
              <FileText size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Export Report
            </button>
          </div>
        </aside>

        <section className="panel log-panel">
          <div className="log-header">
            <h3>Live Intelligence Feed</h3>
            <span className="subtitle" style={{ fontSize: '0.8rem' }}>{status}</span>
          </div>
          <div className="log-content">
            {logs.length === 0 && <div className="text-secondary">Waiting for engine start...</div>}
            {logs.map((log, i) => (
              <div key={i} className={`log-entry ${log.type || ''}`}>
                <span style={{ color: 'var(--text-secondary)', marginRight: '10px' }}>[{log.timestamp}]</span>
                {log.message}
                {log.action?.reason && <small className="action-reason">{log.action.reason}</small>}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
