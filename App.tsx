
import React, { useState, useEffect, useCallback } from 'react';
import { Dashboard } from './components/Dashboard';
import { Deployment, LogEntry, Metrics, VersionMetrics } from './types';
import { INITIAL_DEPLOYMENTS } from './constants';

const App: React.FC = () => {
  const [deployments, setDeployments] = useState<Record<string, Deployment>>(INITIAL_DEPLOYMENTS);
  const [trafficSplit, setTrafficSplit] = useState<number>(0);
  const [metrics, setMetrics] = useState<Metrics>({ stable: [], canary: [] });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [simulationTime, setSimulationTime] = useState(0);

  const generateMetrics = useCallback((version: Deployment, baseLatency: number, baseSuccessRate: number): VersionMetrics => {
    const latencyJitter = (Math.random() - 0.5) * 20;
    const successJitter = (Math.random() - 0.5) * 0.04;
    return {
      time: simulationTime,
      latency: Math.max(50, baseLatency + latencyJitter),
      successRate: Math.max(0.9, Math.min(1, baseSuccessRate + successJitter)),
    };
  }, [simulationTime]);
  
  const generateLog = useCallback((): LogEntry => {
    const isCanary = Math.random() * 100 < trafficSplit;
    const target = isCanary ? 'canary' : 'stable';
    const status = (isCanary && Math.random() > 0.95) || (!isCanary && Math.random() > 0.98) ? 500 : 200;
    const latency = isCanary ? 120 + (Math.random() - 0.5) * 40 : 100 + (Math.random() - 0.5) * 20;

    return {
      timestamp: new Date(),
      target,
      version: deployments[target].version,
      status,
      latency: Math.round(latency),
    };
  }, [trafficSplit, deployments]);

  useEffect(() => {
    const metricsInterval = setInterval(() => {
        setSimulationTime(t => t + 1);
        setMetrics(prevMetrics => {
            const newStableMetrics = generateMetrics(deployments.stable, 100, 0.99);
            const newCanaryMetrics = generateMetrics(deployments.canary, 120, 0.97);

            const stable = [...prevMetrics.stable, newStableMetrics].slice(-30);
            const canary = [...prevMetrics.canary, newCanaryMetrics].slice(-30);

            return { stable, canary };
        });
    }, 2000);

    const logsInterval = setInterval(() => {
        if (trafficSplit > 0) {
            setLogs(prevLogs => [generateLog(), ...prevLogs].slice(0, 100));
        }
    }, 750);

    return () => {
        clearInterval(metricsInterval);
        clearInterval(logsInterval);
    };
  }, [deployments, trafficSplit, generateMetrics, generateLog]);

  const handlePromote = () => {
    if (isDeploying) return;
    setIsDeploying(true);
    setTimeout(() => {
        const canaryVersion = deployments.canary.version;
        const newCanaryVersion = `v${(parseFloat(canaryVersion.slice(1)) + 0.1).toFixed(1)}`;

        setDeployments({
            stable: { ...deployments.canary, version: canaryVersion },
            canary: { ...deployments.canary, version: newCanaryVersion },
        });
        setTrafficSplit(0);
        setMetrics({ stable: [], canary: [] });
        setLogs([]);
        setSimulationTime(0);
        setIsDeploying(false);
    }, 2000);
  };

  const handleRollback = () => {
    if (isDeploying) return;
    setIsDeploying(true);
    setTimeout(() => {
        const stableVersion = deployments.stable.version;
        const newCanaryVersion = `v${(parseFloat(stableVersion.slice(1)) + 0.1).toFixed(1)}`;

        setDeployments(prev => ({
            ...prev,
            canary: { ...prev.canary, version: newCanaryVersion, status: 'Provisioning' }
        }));
        setTrafficSplit(0);
        setMetrics({ stable: [], canary: [] });
        setLogs([]);
        setSimulationTime(0);
        
        setTimeout(() => {
             setDeployments(prev => ({
                ...prev,
                canary: { ...prev.canary, status: 'Running' }
            }));
            setIsDeploying(false);
        }, 1500)

    }, 2000);
  };

  return (
    <Dashboard
      deployments={deployments}
      trafficSplit={trafficSplit}
      onTrafficSplitChange={setTrafficSplit}
      metrics={metrics}
      logs={logs}
      onPromote={handlePromote}
      onRollback={handleRollback}
      isDeploying={isDeploying}
    />
  );
};

export default App;
