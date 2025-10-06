
export interface Deployment {
  version: string;
  instances: number;
  status: 'Running' | 'Provisioning' | 'Failed';
  cpu: string;
  memory: string;
}

export interface LogEntry {
  timestamp: Date;
  target: 'stable' | 'canary';
  version: string;
  status: number;
  latency: number;
}

export interface VersionMetrics {
    time: number;
    latency: number;
    successRate: number;
}

export interface Metrics {
    stable: VersionMetrics[];
    canary: VersionMetrics[];
}
