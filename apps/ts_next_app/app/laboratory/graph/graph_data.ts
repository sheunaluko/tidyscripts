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
    { source: 'hub', target: 'serviceA', weight: 3, metadata: { protocol: 'HTTPS', latency: '5ms', directed: true } },
    { source: 'hub', target: 'serviceB', weight: 2.5, metadata: { protocol: 'HTTPS', latency: '8ms', directed: true } },
    { source: 'hub', target: 'database', weight: 4, metadata: { protocol: 'SQL', latency: '2ms', directed: true } },
    { source: 'serviceA', target: 'cache', weight: 2, metadata: { protocol: 'Redis', latency: '1ms', directed: true } },
    { source: 'serviceB', target: 'gateway', weight: 1.5, metadata: { protocol: 'REST', latency: '10ms', directed: true } },
    { source: 'database', target: 'analytics', weight: 1, metadata: { protocol: 'ETL', latency: '50ms', directed: true } },
    { source: 'cache', target: 'monitoring', weight: 0.8, metadata: { protocol: 'Metrics', latency: '20ms', directed: true } },
    { source: 'gateway', target: 'analytics', weight: 0.5, metadata: { protocol: 'Logs', latency: '30ms', directed: true } },
    { source: 'loadBalancer', target: 'hub', weight: 3.5, metadata: { protocol: 'TCP', latency: '3ms', directed: true } },
    { source: 'loadBalancer', target: 'gateway', weight: 2, metadata: { protocol: 'HTTP', latency: '7ms', directed: true } }
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
    { source: 'cto', target: 'ceo', weight: 3, metadata: { relationship: 'reports to', type: 'direct', directed: true } },
    { source: 'cfo', target: 'ceo', weight: 3, metadata: { relationship: 'reports to', type: 'direct', directed: true } },
    { source: 'vp_eng', target: 'cto', weight: 2.5, metadata: { relationship: 'reports to', type: 'direct', directed: true } },
    { source: 'vp_product', target: 'cto', weight: 2.5, metadata: { relationship: 'reports to', type: 'direct', directed: true } },
    { source: 'eng_lead1', target: 'vp_eng', weight: 2, metadata: { relationship: 'reports to', type: 'direct', directed: true } },
    { source: 'eng_lead2', target: 'vp_eng', weight: 2, metadata: { relationship: 'reports to', type: 'direct', directed: true } },
    { source: 'product_mgr', target: 'vp_product', weight: 2, metadata: { relationship: 'reports to', type: 'direct', directed: true } },
    { source: 'finance_mgr', target: 'cfo', weight: 2, metadata: { relationship: 'reports to', type: 'direct', directed: true } },
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

// Directed Workflow Dataset
export const directedWorkflowData: GraphData = {
  nodes: [
    { id: 'start', label: 'Start', size: 18, color: '#27ae60', metadata: { type: 'trigger', status: 'active' } },
    { id: 'validate', label: 'Validate Input', size: 16, color: '#3498db', metadata: { type: 'process', duration: '2s' } },
    { id: 'decision', label: 'Check Approval', size: 20, color: '#f39c12', metadata: { type: 'decision', criteria: 'amount > $1000' } },
    { id: 'autoApprove', label: 'Auto Approve', size: 15, color: '#2ecc71', metadata: { type: 'action', automated: true } },
    { id: 'manualReview', label: 'Manual Review', size: 15, color: '#e67e22', metadata: { type: 'action', assignee: 'manager' } },
    { id: 'approved', label: 'Approved', size: 16, color: '#27ae60', metadata: { type: 'status', final: true } },
    { id: 'rejected', label: 'Rejected', size: 16, color: '#e74c3c', metadata: { type: 'status', final: true } },
    { id: 'notify', label: 'Send Notification', size: 14, color: '#9b59b6', metadata: { type: 'action', method: 'email' } },
    { id: 'end', label: 'End', size: 14, color: '#95a5a6', metadata: { type: 'terminator', status: 'complete' } }
  ],
  edges: [
    { 
      source: 'start', 
      target: 'validate', 
      weight: 2, 
      metadata: { 
        label: 'receives input',
        type: 'data_flow',
        description: 'User submits request',
        directed: true
      }
    },
    { 
      source: 'validate', 
      target: 'decision', 
      weight: 2, 
      metadata: { 
        label: 'validated data',
        type: 'data_flow',
        description: 'Input passes validation checks',
        directed: true
      }
    },
    { 
      source: 'decision', 
      target: 'autoApprove', 
      weight: 1.5, 
      metadata: { 
        label: 'amount ≤ $1000',
        type: 'condition',
        description: 'Low value transactions auto-approved',
        directed: true
      }
    },
    { 
      source: 'decision', 
      target: 'manualReview', 
      weight: 1.5, 
      metadata: { 
        label: 'amount > $1000',
        type: 'condition',
        description: 'High value requires manual review',
        directed: true
      }
    },
    { 
      source: 'autoApprove', 
      target: 'approved', 
      weight: 2, 
      metadata: { 
        label: 'approved',
        type: 'status_change',
        description: 'Automatically approved by system',
        directed: true
      }
    },
    { 
      source: 'manualReview', 
      target: 'approved', 
      weight: 1, 
      metadata: { 
        label: 'manager approves',
        type: 'decision',
        description: 'Manager reviews and approves',
        directed: true
      }
    },
    { 
      source: 'manualReview', 
      target: 'rejected', 
      weight: 1, 
      metadata: { 
        label: 'manager rejects',
        type: 'decision',
        description: 'Manager reviews and rejects',
        directed: true
      }
    },
    { 
      source: 'approved', 
      target: 'notify', 
      weight: 2, 
      metadata: { 
        label: 'success notification',
        type: 'action',
        description: 'Send approval notification to user',
        directed: true
      }
    },
    { 
      source: 'rejected', 
      target: 'notify', 
      weight: 2, 
      metadata: { 
        label: 'rejection notification',
        type: 'action',
        description: 'Send rejection notification to user',
        directed: true
      }
    },
    { 
      source: 'notify', 
      target: 'end', 
      weight: 1.5, 
      metadata: { 
        label: 'complete',
        type: 'completion',
        description: 'Workflow completed',
        directed: true
      }
    }
  ]
};

export const graphDatasets = {
  'System Architecture': systemArchitectureData,
  'Social Network': socialNetworkData,
  'Organization Chart': organizationData,
  'Star Network': starData,
  'Dense Network': denseNetworkData,
  'Directed Workflow': directedWorkflowData
};