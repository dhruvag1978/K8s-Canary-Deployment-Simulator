
import { Deployment } from './types';

export const INITIAL_DEPLOYMENTS: Record<string, Deployment> = {
  stable: {
    version: 'v1.0',
    instances: 5,
    status: 'Running',
    cpu: '250m',
    memory: '512Mi',
  },
  canary: {
    version: 'v1.1',
    instances: 1,
    status: 'Running',
    cpu: '250m',
    memory: '512Mi',
  },
};

export const K8S_DEPLOYMENT_YAML = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-stable
spec:
  replicas: 5
  selector:
    matchLabels:
      app: my-app
      version: stable
  template:
    metadata:
      labels:
        app: my-app
        version: stable
    spec:
      containers:
      - name: my-app
        image: my-app:1.0
        ports:
        - containerPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-canary
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
      version: canary
  template:
    metadata:
      labels:
        app: my-app
        version: canary
    spec:
      containers:
      - name: my-app
        image: my-app:1.1
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: my-app-service
spec:
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
    name: http
  selector:
    app: my-app
`;

export const ISTIO_GATEWAY_YAML = `
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: my-app-gateway
spec:
  selector:
    istio: ingressgateway # use Istio default controller
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "*"
`;

export const ISTIO_VIRTUALSERVICE_YAML = `
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: my-app-virtual-service
spec:
  hosts:
  - "*"
  gateways:
  - my-app-gateway
  http:
  - route:
    - destination:
        host: my-app-service
        subset: stable
      weight: 80
    - destination:
        host: my-app-service
        subset: canary
      weight: 20
---
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: my-app-destination-rule
spec:
  host: my-app-service
  subsets:
  - name: stable
    labels:
      version: stable
  - name: canary
    labels:
      version: canary
`;

export const STRATEGY_DOCUMENT = `
# Canary Deployment Strategy

## 1. Objective
To safely roll out new versions of the 'my-app' application by gradually shifting production traffic from the stable version to the new canary version. This minimizes the impact of potential issues and allows for performance validation under real-world load.

## 2. Phases

### Phase 1: Canary Initialization (0% -> 10% Traffic)
- **Action:** Deploy the new version (canary) alongside the existing stable version.
- **Initial Traffic Split:** Set Istio VirtualService to route 10% of traffic to the canary and 90% to stable.
- **Monitoring:** Closely monitor canary performance metrics:
    - **Success Rate:** Must remain >= 99.5%.
    - **P95 Latency:** Must not exceed stable latency by more than 20%.
    - **Error Rate:** Check for any new or increased HTTP 5xx errors in logs.
- **Duration:** 15 minutes.

### Phase 2: Traffic Increase (10% -> 50% Traffic)
- **Action:** If Phase 1 metrics are nominal, increase canary traffic weight to 50%.
- **Monitoring:** Continue to monitor key metrics. Pay attention to downstream service impact and resource utilization (CPU/Memory) of the canary pods.
- **Duration:** 30 minutes.

### Phase 3: Full Rollout or Rollback
- **Decision Point:** After Phase 2, a decision is made based on collected data.

#### **Promotion (Promote to Stable):**
- **Condition:** Canary has performed nominally for the duration of the test, meeting or exceeding all performance baselines.
- **Action:**
    1. Update Istio VirtualService to route 100% of traffic to the canary subset.
    2. After a brief monitoring period, update the stable Kubernetes Deployment with the canary's container image.
    3. Decommission the old stable pods and the canary Deployment.
    4. Reset the VirtualService to route 100% to the new stable version.

#### **Rollback:**
- **Condition:** Canary shows degraded performance (increased latency, high error rate) or critical bugs are discovered.
- **Action:**
    1. Immediately update the Istio VirtualService to route 100% of traffic back to the stable version (0% to canary).
    2. Investigate the issue using logs and metrics.
    3. Once the issue is resolved, a new canary version can be deployed, restarting the process.

## 3. Tools
- **Kubernetes (K3s):** For container orchestration.
- **Istio:** For traffic management (splitting via VirtualService and DestinationRule).
- **Prometheus/Grafana:** For metrics collection and visualization (not included in this simulation).
- **Helm:** For templating and managing Kubernetes manifests.
`;
