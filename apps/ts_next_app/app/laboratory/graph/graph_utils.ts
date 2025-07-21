import { GraphData, GraphNode, GraphEdge } from './graph';

// Type definitions for SurrealDB query result
export interface SurrealNode {
  eid: string;
  category?: string;
  eid_vector?: number[];
  id?: string;
  [key: string]: any;
}

export interface SurrealEdge {
  id: string;
  in: string;
  out: string;
  rid?: string;
  kud?: string;
  [key: string]: any;
}

export interface SurrealQueryResult {
  eid: string;
  incoming_edges?: SurrealEdge[];
  incoming_nodes?: SurrealNode[];
  outgoing_edges?: SurrealEdge[];
  outgoing_nodes?: SurrealNode[];
  [key: string]: any;
}

/**
 * Converts SurrealDB query results to Sigma.js compatible format
 * @param surrealData - Array of SurrealDB query results
 * @returns GraphData object compatible with Sigma.js
 */
export function convertSurrealToSigma(surrealData: SurrealQueryResult[]): GraphData {
  const nodesMap = new Map<string, GraphNode>();
  const edgesMap = new Map<string, GraphEdge>();

  // Process each result in the SurrealDB data
  surrealData.forEach((result) => {
    // Add the main entity as a node if not already added
    if (!nodesMap.has(result.eid)) {
      nodesMap.set(result.eid, {
        id: result.eid,
        label: result.eid.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        size: 20,
        color: getCategoryColor(result.category || 'default'),
        metadata: {
          category: result.category,
          ...Object.fromEntries(
            Object.entries(result).filter(([key]) => 
              !['eid', 'incoming_edges', 'incoming_nodes', 'outgoing_edges', 'outgoing_nodes', 'eid_vector'].includes(key)
            )
          )
        }
      });
    }

    // Process incoming nodes and edges
    if (result.incoming_nodes) {
      result.incoming_nodes.forEach((node) => {
        const nodeId = (node.eid || node.id || `node_${Math.random()}`).replace(/⟨|⟩/g, '');
        if (!nodesMap.has(nodeId)) {
          nodesMap.set(nodeId, {
            id: nodeId,
            label: nodeId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            size: 15,
            color: getCategoryColor(node.category || 'default'),
            metadata: {
              category: node.category,
              ...Object.fromEntries(
                Object.entries(node).filter(([key]) => 
                  !['eid', 'id', 'category', 'eid_vector'].includes(key)
                )
              )
            }
          });
        }
      });
    }

    if (result.incoming_edges) {
      result.incoming_edges.forEach((edge) => {
        const edgeId = edge.id || `${edge.in}_to_${edge.out}`;
        if (!edgesMap.has(edgeId)) {
          const sourceId = (edge.in?.replace('entity:', '') || edge.in).replace(/⟨|⟩/g, '');
          const targetId = (edge.out?.replace('entity:', '') || edge.out).replace(/⟨|⟩/g, '');
          
          // Ensure source and target nodes exist
          if (!nodesMap.has(sourceId)) {
            nodesMap.set(sourceId, {
              id: sourceId,
              label: sourceId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              size: 15,
              color: getCategoryColor('default'),
              metadata: { category: 'unknown' }
            });
          }
          
          if (!nodesMap.has(targetId)) {
            nodesMap.set(targetId, {
              id: targetId,
              label: targetId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              size: 15,
              color: getCategoryColor('default'),
              metadata: { category: 'unknown' }
            });
          }
          
          edgesMap.set(edgeId, {
            id: edgeId,
            source: sourceId,
            target: targetId,
            weight: 1,
            size: 2,
            color: '#999999',
            metadata: {
              label: getEdgeLabel(edge),
              directed: true,
              description: `${sourceId} ${getEdgeLabel(edge)} ${targetId}`,
              relationship_id: edge.rid,
              knowledge_update: edge.kud,
              ...Object.fromEntries(
                Object.entries(edge).filter(([key]) => 
                  !['id', 'in', 'out', 'rid', 'kud'].includes(key)
                )
              )
            }
          });
        }
      });
    }

    // Process outgoing nodes and edges
    if (result.outgoing_nodes) {
      result.outgoing_nodes.forEach((node) => {
        const nodeId = (node.eid || node.id || `node_${Math.random()}`).replace(/⟨|⟩/g, '');
        if (!nodesMap.has(nodeId)) {
          nodesMap.set(nodeId, {
            id: nodeId,
            label: nodeId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            size: 15,
            color: getCategoryColor(node.category || 'default'),
            metadata: {
              category: node.category,
              ...Object.fromEntries(
                Object.entries(node).filter(([key]) => 
                  !['eid', 'id', 'category', 'eid_vector'].includes(key)
                )
              )
            }
          });
        }
      });
    }

    if (result.outgoing_edges) {
      result.outgoing_edges.forEach((edge) => {
        const edgeId = edge.id || `${edge.in}_to_${edge.out}`;
        if (!edgesMap.has(edgeId)) {
          const sourceId = (edge.in?.replace('entity:', '') || edge.in).replace(/⟨|⟩/g, '');
          const targetId = (edge.out?.replace('entity:', '') || edge.out).replace(/⟨|⟩/g, '');
          
          // Ensure source and target nodes exist
          if (!nodesMap.has(sourceId)) {
            nodesMap.set(sourceId, {
              id: sourceId,
              label: sourceId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              size: 15,
              color: getCategoryColor('default'),
              metadata: { category: 'unknown' }
            });
          }
          
          if (!nodesMap.has(targetId)) {
            nodesMap.set(targetId, {
              id: targetId,
              label: targetId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              size: 15,
              color: getCategoryColor('default'),
              metadata: { category: 'unknown' }
            });
          }
          
          edgesMap.set(edgeId, {
            id: edgeId,
            source: sourceId,
            target: targetId,
            weight: 1,
            size: 2,
            color: '#999999',
            metadata: {
              label: getEdgeLabel(edge),
              directed: true,
              description: `${sourceId} ${getEdgeLabel(edge)} ${targetId}`,
              relationship_id: edge.rid,
              knowledge_update: edge.kud,
              ...Object.fromEntries(
                Object.entries(edge).filter(([key]) => 
                  !['id', 'in', 'out', 'rid', 'kud'].includes(key)
                )
              )
            }
          });
        }
      });
    }
  });

  return {
    nodes: Array.from(nodesMap.values()),
    edges: Array.from(edgesMap.values())
  };
}

/**
 * Get color based on category
 * @param category - The category of the node
 * @returns Hex color string
 */
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'condition': '#e74c3c',
    'medication': '#3498db',
    'procedure': '#2ecc71',
    'symptom': '#f39c12',
    'diagnosis': '#9b59b6',
    'treatment': '#1abc9c',
    'anatomy': '#34495e',
    'device': '#e67e22',
    'default': '#95a5a6'
  };

  return colors[category.toLowerCase()] || colors.default;
}

/**
 * Extract a readable label from edge data
 * @param edge - The SurrealDB edge object
 * @returns A readable edge label
 */
function getEdgeLabel(edge: SurrealEdge): string {
  // Try to extract relationship type from the edge ID or rid
  if (edge.rid) {
    const parts = edge.rid.split('->');
    if (parts.length >= 2) {
      return parts[1].replace(/_/g, ' ');
    }
  }
  
  if (edge.id) {
    const colonIndex = edge.id.indexOf(':');
    if (colonIndex !== -1) {
      const relationship = edge.id.substring(0, colonIndex);
      return relationship.replace(/_/g, ' ');
    }
  }
  
  return 'related to';
}

/**
 * Enhanced conversion with custom node sizing based on connection count
 * @param surrealData - Array of SurrealDB query results
 * @param options - Conversion options
 * @returns GraphData object compatible with Sigma.js
 */
export function convertSurrealToSigmaEnhanced(
  surrealData: SurrealQueryResult[], 
  options: {
    baseNodeSize?: number;
    maxNodeSize?: number;
    edgeWeight?: number;
    useConnectionSizing?: boolean;
  } = {}
): GraphData {
  const {
    baseNodeSize = 15,
    maxNodeSize = 30,
    edgeWeight = 1,
    useConnectionSizing = true
  } = options;

  const basicResult = convertSurrealToSigma(surrealData);
  
  if (!useConnectionSizing) {
    return basicResult;
  }

  // Calculate connection counts for node sizing
  const connectionCounts = new Map<string, number>();
  
  basicResult.edges.forEach(edge => {
    connectionCounts.set(edge.source, (connectionCounts.get(edge.source) || 0) + 1);
    connectionCounts.set(edge.target, (connectionCounts.get(edge.target) || 0) + 1);
  });

  const maxConnections = Math.max(...Array.from(connectionCounts.values()));

  // Update node sizes based on connections
  basicResult.nodes = basicResult.nodes.map(node => ({
    ...node,
    size: baseNodeSize + ((connectionCounts.get(node.id) || 0) / maxConnections) * (maxNodeSize - baseNodeSize)
  }));

  // Update edge weights
  basicResult.edges = basicResult.edges.map(edge => ({
    ...edge,
    weight: edgeWeight
  }));

  return basicResult;
}