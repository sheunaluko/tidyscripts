import { GraphData } from './graph';

// System Architecture Dataset
export const systemArchitectureData: GraphData = {
  nodes: [
    { 
      id: 'hub', 
      label: 'Central Hub', 
      size: 25, 
      color: '#e74c3c',
      metadata: { type: 'hub', importance: 'critical' }
    },
    { 
      id: 'serviceA', 
      label: 'Service A', 
      size: 18, 
      color: '#3498db',
      metadata: { type: 'service', uptime: '99.9%' }
    },
    { 
      id: 'serviceB', 
      label: 'Service B', 
      size: 18, 
      color: '#2ecc71',
      metadata: { type: 'service', uptime: '99.8%' }
    },
    { 
      id: 'database', 
      label: 'Database', 
      size: 20, 
      color: '#f39c12',
      metadata: { type: 'database', storage: '2.5TB' }
    },
    { 
      id: 'cache', 
      label: 'Cache Layer', 
      size: 15, 
      color: '#9b59b6',
      metadata: { type: 'cache', hitRate: '94%' }
    },
    { 
      id: 'gateway', 
      label: 'API Gateway', 
      size: 16, 
      color: '#1abc9c',
      metadata: { type: 'gateway', requests: '10k/sec' }
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      size: 12, 
      color: '#34495e',
      metadata: { type: 'analytics', dataPoints: '50M' }
    },
    { 
      id: 'monitoring', 
      label: 'Monitoring', 
      size: 14, 
      color: '#e67e22',
      metadata: { type: 'monitoring', alerts: 3 }
    },
    { 
      id: 'loadBalancer', 
      label: 'Load Balancer', 
      size: 17, 
      color: '#95a5a6',
      metadata: { type: 'infrastructure', instances: 4 }
    }
  ],
  edges: [
    { source: 'hub', target: 'serviceA', weight: 3, metadata: { protocol: 'HTTPS', latency: '5ms' } },
    { source: 'hub', target: 'serviceB', weight: 2.5, metadata: { protocol: 'HTTPS', latency: '8ms' } },
    { source: 'hub', target: 'database', weight: 4, metadata: { protocol: 'SQL', latency: '2ms' } },
    { source: 'serviceA', target: 'cache', weight: 2, metadata: { protocol: 'Redis', latency: '1ms' } },
    { source: 'serviceB', target: 'gateway', weight: 1.5, metadata: { protocol: 'REST', latency: '10ms' } },
    { source: 'database', target: 'analytics', weight: 1, metadata: { protocol: 'ETL', latency: '50ms' } },
    { source: 'cache', target: 'monitoring', weight: 0.8, metadata: { protocol: 'Metrics', latency: '20ms' } },
    { source: 'gateway', target: 'analytics', weight: 0.5, metadata: { protocol: 'Logs', latency: '30ms' } },
    { source: 'loadBalancer', target: 'hub', weight: 3.5, metadata: { protocol: 'TCP', latency: '3ms' } },
    { source: 'loadBalancer', target: 'gateway', weight: 2, metadata: { protocol: 'HTTP', latency: '7ms' } }
  ]
};

// Social Network Dataset
export const socialNetworkData: GraphData = {
  nodes: [
    { id: 'alice', label: 'Alice', size: 20, color: '#e91e63', metadata: { friends: 15, posts: 142 } },
    { id: 'bob', label: 'Bob', size: 18, color: '#2196f3', metadata: { friends: 12, posts: 89 } },
    { id: 'carol', label: 'Carol', size: 16, color: '#4caf50', metadata: { friends: 8, posts: 67 } },
    { id: 'dave', label: 'Dave', size: 15, color: '#ff9800', metadata: { friends: 10, posts: 34 } },
    { id: 'eve', label: 'Eve', size: 22, color: '#9c27b0', metadata: { friends: 18, posts: 203 } },
    { id: 'frank', label: 'Frank', size: 14, color: '#607d8b', metadata: { friends: 6, posts: 23 } },
    { id: 'grace', label: 'Grace', size: 19, color: '#795548', metadata: { friends: 14, posts: 156 } },
    { id: 'henry', label: 'Henry', size: 13, color: '#f44336', metadata: { friends: 5, posts: 12 } }
  ],
  edges: [
    { source: 'alice', target: 'bob', weight: 2, metadata: { relationship: 'close friends', since: '2020' } },
    { source: 'alice', target: 'carol', weight: 1, metadata: { relationship: 'colleagues', since: '2021' } },
    { source: 'alice', target: 'eve', weight: 3, metadata: { relationship: 'best friends', since: '2018' } },
    { source: 'bob', target: 'dave', weight: 1.5, metadata: { relationship: 'gaming buddies', since: '2022' } },
    { source: 'carol', target: 'grace', weight: 2, metadata: { relationship: 'neighbors', since: '2019' } },
    { source: 'dave', target: 'frank', weight: 1, metadata: { relationship: 'gym partners', since: '2023' } },
    { source: 'eve', target: 'grace', weight: 1.5, metadata: { relationship: 'book club', since: '2021' } },
    { source: 'frank', target: 'henry', weight: 0.5, metadata: { relationship: 'distant friends', since: '2022' } },
    { source: 'alice', target: 'grace', weight: 1, metadata: { relationship: 'mutual friends', since: '2020' } },
    { source: 'bob', target: 'eve', weight: 0.8, metadata: { relationship: 'acquaintances', since: '2021' } }
  ]
};

// Organization Chart Dataset
export const organizationData: GraphData = {
  nodes: [
    { id: 'ceo', label: 'CEO', size: 25, color: '#1a237e', metadata: { department: 'Executive', level: 1 } },
    { id: 'cto', label: 'CTO', size: 20, color: '#283593', metadata: { department: 'Technology', level: 2 } },
    { id: 'cfo', label: 'CFO', size: 20, color: '#303f9f', metadata: { department: 'Finance', level: 2 } },
    { id: 'vp_eng', label: 'VP Engineering', size: 18, color: '#3949ab', metadata: { department: 'Engineering', level: 3 } },
    { id: 'vp_product', label: 'VP Product', size: 18, color: '#3f51b5', metadata: { department: 'Product', level: 3 } },
    { id: 'eng_lead1', label: 'Engineering Lead 1', size: 15, color: '#5c6bc0', metadata: { department: 'Engineering', level: 4 } },
    { id: 'eng_lead2', label: 'Engineering Lead 2', size: 15, color: '#7986cb', metadata: { department: 'Engineering', level: 4 } },
    { id: 'product_mgr', label: 'Product Manager', size: 15, color: '#9fa8da', metadata: { department: 'Product', level: 4 } },
    { id: 'finance_mgr', label: 'Finance Manager', size: 15, color: '#c5cae9', metadata: { department: 'Finance', level: 4 } }
  ],
  edges: [
    { source: 'ceo', target: 'cto', weight: 3, metadata: { relationship: 'reports to', type: 'direct' } },
    { source: 'ceo', target: 'cfo', weight: 3, metadata: { relationship: 'reports to', type: 'direct' } },
    { source: 'cto', target: 'vp_eng', weight: 2.5, metadata: { relationship: 'reports to', type: 'direct' } },
    { source: 'cto', target: 'vp_product', weight: 2.5, metadata: { relationship: 'reports to', type: 'direct' } },
    { source: 'vp_eng', target: 'eng_lead1', weight: 2, metadata: { relationship: 'reports to', type: 'direct' } },
    { source: 'vp_eng', target: 'eng_lead2', weight: 2, metadata: { relationship: 'reports to', type: 'direct' } },
    { source: 'vp_product', target: 'product_mgr', weight: 2, metadata: { relationship: 'reports to', type: 'direct' } },
    { source: 'cfo', target: 'finance_mgr', weight: 2, metadata: { relationship: 'reports to', type: 'direct' } },
    { source: 'vp_eng', target: 'product_mgr', weight: 1, metadata: { relationship: 'collaborates', type: 'cross-functional' } },
    { source: 'eng_lead1', target: 'eng_lead2', weight: 1.5, metadata: { relationship: 'coordinates', type: 'peer' } }
  ]
};

// Simple Star Dataset
export const starData: GraphData = {
  nodes: [
    { id: 'center', label: 'Center', size: 30, color: '#ffeb3b', metadata: { type: 'core' } },
    { id: 'node1', label: 'Node 1', size: 15, color: '#ff5722', metadata: { type: 'satellite' } },
    { id: 'node2', label: 'Node 2', size: 15, color: '#e91e63', metadata: { type: 'satellite' } },
    { id: 'node3', label: 'Node 3', size: 15, color: '#9c27b0', metadata: { type: 'satellite' } },
    { id: 'node4', label: 'Node 4', size: 15, color: '#673ab7', metadata: { type: 'satellite' } },
    { id: 'node5', label: 'Node 5', size: 15, color: '#3f51b5', metadata: { type: 'satellite' } },
    { id: 'node6', label: 'Node 6', size: 15, color: '#2196f3', metadata: { type: 'satellite' } }
  ],
  edges: [
    { source: 'center', target: 'node1', weight: 2, metadata: { type: 'primary' } },
    { source: 'center', target: 'node2', weight: 2, metadata: { type: 'primary' } },
    { source: 'center', target: 'node3', weight: 2, metadata: { type: 'primary' } },
    { source: 'center', target: 'node4', weight: 2, metadata: { type: 'primary' } },
    { source: 'center', target: 'node5', weight: 2, metadata: { type: 'primary' } },
    { source: 'center', target: 'node6', weight: 2, metadata: { type: 'primary' } }
  ]
};

// Dense Network Dataset
export const denseNetworkData: GraphData = {
  nodes: [
    { id: 'A', label: 'Alpha', size: 18, color: '#f44336', metadata: { cluster: 'red' } },
    { id: 'B', label: 'Beta', size: 16, color: '#e91e63', metadata: { cluster: 'red' } },
    { id: 'C', label: 'Gamma', size: 20, color: '#9c27b0', metadata: { cluster: 'purple' } },
    { id: 'D', label: 'Delta', size: 17, color: '#673ab7', metadata: { cluster: 'purple' } },
    { id: 'E', label: 'Epsilon', size: 19, color: '#3f51b5', metadata: { cluster: 'blue' } },
    { id: 'F', label: 'Zeta', size: 15, color: '#2196f3', metadata: { cluster: 'blue' } },
    { id: 'G', label: 'Eta', size: 21, color: '#03a9f4', metadata: { cluster: 'cyan' } },
    { id: 'H', label: 'Theta', size: 14, color: '#00bcd4', metadata: { cluster: 'cyan' } },
    { id: 'I', label: 'Iota', size: 16, color: '#009688', metadata: { cluster: 'teal' } },
    { id: 'J', label: 'Kappa', size: 18, color: '#4caf50', metadata: { cluster: 'green' } }
  ],
  edges: [
    { source: 'A', target: 'B', weight: 2, metadata: { type: 'strong' } },
    { source: 'A', target: 'C', weight: 1, metadata: { type: 'weak' } },
    { source: 'A', target: 'E', weight: 1.5, metadata: { type: 'medium' } },
    { source: 'B', target: 'D', weight: 1, metadata: { type: 'weak' } },
    { source: 'B', target: 'F', weight: 2, metadata: { type: 'strong' } },
    { source: 'C', target: 'D', weight: 2.5, metadata: { type: 'strong' } },
    { source: 'C', target: 'G', weight: 1, metadata: { type: 'weak' } },
    { source: 'D', target: 'H', weight: 1.5, metadata: { type: 'medium' } },
    { source: 'E', target: 'F', weight: 1.8, metadata: { type: 'medium' } },
    { source: 'E', target: 'I', weight: 1, metadata: { type: 'weak' } },
    { source: 'F', target: 'G', weight: 1.2, metadata: { type: 'medium' } },
    { source: 'G', target: 'H', weight: 2, metadata: { type: 'strong' } },
    { source: 'G', target: 'J', weight: 1, metadata: { type: 'weak' } },
    { source: 'H', target: 'I', weight: 1.5, metadata: { type: 'medium' } },
    { source: 'I', target: 'J', weight: 2.2, metadata: { type: 'strong' } },
    { source: 'A', target: 'J', weight: 0.8, metadata: { type: 'weak' } }
  ]
};

export const graphDatasets = {
  'System Architecture': systemArchitectureData,
  'Social Network': socialNetworkData,
  'Organization Chart': organizationData,
  'Star Network': starData,
  'Dense Network': denseNetworkData
};