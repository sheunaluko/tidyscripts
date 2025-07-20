'use client';

import React, { FC, useEffect, useState } from 'react';
import { SigmaContainer, useLoadGraph, useSigma, useRegisterEvents, useSetSettings } from '@react-sigma/core';
import { useWorkerLayoutForceAtlas2 } from '@react-sigma/layout-forceatlas2';
import "@react-sigma/core/lib/style.css";
import { inferSettings } from 'graphology-layout-forceatlas2';

import Graph from 'graphology';

export interface GraphNode {
  id: string;
  label?: string;
  size?: number;
  color?: string;
  x?: number;
  y?: number;
  metadata?: Record<string, any>;
}

export interface GraphEdge {
  id?: string;
  source: string;
  target: string;
  weight?: number;
  size?: number;
  color?: string;
  metadata?: Record<string, any>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphSettings {
  gravity?: number;
  scalingRatio?: number;
  barnesHutOptimize?: boolean;
  barnesHutTheta?: number;
  edgeWeightInfluence?: number;
  linLogMode?: boolean;
  strongGravityMode?: boolean;
  adjustSizes?: boolean;
  slowDown?: number;
  animationDuration?: number;
  outboundAttractionDistribution? : boolean; 
}

export interface GraphComponentProps {
  data: GraphData;
  width?: string | number;
  height?: string | number;
  settings?: GraphSettings;
  enableAnimation?: boolean;
  enableHoverEffects?: boolean;
  onNodeClick?: (nodeId: string, metadata?: Record<string, any>) => void;
  onEdgeClick?: (edgeId: string, metadata?: Record<string, any>) => void;
  onNodeHover?: (nodeId: string | null) => void;
  className?: string;
  style?: React.CSSProperties;
}

const defaultSettings: GraphSettings = {
  gravity: 1,
  scalingRatio: 2,
  barnesHutOptimize: true,
  barnesHutTheta: 0.5,
  edgeWeightInfluence: 0,
  linLogMode: false,
  strongGravityMode: false,
  adjustSizes: false,
  slowDown: 300000,
  animationDuration: 2000,
  outboundAttractionDistribution: false, 
};

// Component to load graph data
const GraphLoader: FC<{ data: GraphData }> = ({ data }) => {
  const loadGraph = useLoadGraph();

  useEffect(() => {
    const graph = new Graph();

    // Add nodes
    data.nodes.forEach(nodeData => {
      graph.addNode(nodeData.id, {
        label: nodeData.label || nodeData.id,
        size: nodeData.size || 10,
        color: nodeData.color || '#3498db',
        x: nodeData.x || Math.random() * 200,
        y: nodeData.y || Math.random() * 200,
        metadata: nodeData.metadata
      });
    });

    // Add edges
    data.edges.forEach(edgeData => {
      const edgeAttributes = {
        size: edgeData.size || (edgeData.weight ? edgeData.weight * 2 : 2),
        color: edgeData.color || '#95a5a6',
        weight: edgeData.weight || 1,
        label: edgeData.metadata?.label || '',
        type: edgeData.metadata?.directed ? 'arrow' : 'line', // Use arrow only if directed: true
        metadata: edgeData.metadata
      };
      
      if (edgeData.id) {
        graph.addEdgeWithKey(edgeData.id, edgeData.source, edgeData.target, edgeAttributes);
      } else {
        graph.addEdge(edgeData.source, edgeData.target, edgeAttributes);
      }
    });

    loadGraph(graph);
  }, [loadGraph, data]);

  return null;
};

// Component to handle ForceAtlas2 layout
const ForceAtlas2Layout: FC<{ 
  settings: GraphSettings; 
  enableAnimation: boolean;
  onLayoutChange?: (isRunning: boolean) => void;
}> = ({ settings, enableAnimation, onLayoutChange }) => {
  const sigma = useSigma();
  
  // Get inferred settings based on the actual graph structure
  const graph = sigma.getGraph();
  const inferredSettings = inferSettings(graph);
  
  // Debug: log inferred settings
  useEffect(() => {
    console.log('Inferred ForceAtlas2 settings:', inferredSettings);
  }, [inferredSettings]);
  
  const { start, kill, isRunning } = useWorkerLayoutForceAtlas2({
    settings: {
      // Start with inferred settings optimized for this graph
      ...inferredSettings,
      // Override with user settings
      ...(settings.gravity !== undefined && { gravity: settings.gravity }),
      ...(settings.scalingRatio !== undefined && { scalingRatio: settings.scalingRatio }),
      ...(settings.barnesHutOptimize !== undefined && { barnesHutOptimize: settings.barnesHutOptimize }),
      ...(settings.barnesHutTheta !== undefined && { barnesHutTheta: settings.barnesHutTheta }),
      ...(settings.edgeWeightInfluence !== undefined && { edgeWeightInfluence: settings.edgeWeightInfluence }),
      ...(settings.linLogMode !== undefined && { linLogMode: settings.linLogMode }),
      ...(settings.strongGravityMode !== undefined && { strongGravityMode: settings.strongGravityMode }),
      ...(settings.adjustSizes !== undefined && { adjustSizes: settings.adjustSizes }),
      ...(settings.slowDown !== undefined && { slowDown: settings.slowDown })
    }
  });

  useEffect(() => {
    onLayoutChange?.(isRunning);
    
    // When layout stops running, auto-zoom to fit all nodes
    if (!isRunning && enableAnimation) {
      setTimeout(() => {
        const camera = sigma.getCamera();
        camera.animatedReset({ duration: 1000 });
      }, 500); // Small delay to ensure layout is fully stopped
    }
  }, [isRunning, onLayoutChange, enableAnimation, sigma]);

  useEffect(() => {
    if (enableAnimation) {
      start();
      
      // Auto-stop after duration
      const timeout = setTimeout(() => {
        kill();
      }, settings.animationDuration || 8000);

      return () => {
        clearTimeout(timeout);
        kill();
      };
    }
  }, [enableAnimation, start, kill, settings.animationDuration]);

  return null;
};

// Component to handle interactions
const GraphInteractions: FC<{
  enableHoverEffects: boolean;
  onNodeClick?: (nodeId: string, metadata?: Record<string, any>) => void;
  onEdgeClick?: (edgeId: string, metadata?: Record<string, any>) => void;
  onNodeHover?: (nodeId: string | null) => void;
}> = ({ enableHoverEffects, onNodeClick, onEdgeClick, onNodeHover }) => {
  const sigma = useSigma();
  const setSettings = useSetSettings();
  const registerEvents = useRegisterEvents();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Handle hover effects
  useEffect(() => {
    if (!enableHoverEffects) return;

    if (hoveredNode) {
      const graph = sigma.getGraph();
      const neighbors = new Set(graph.neighbors(hoveredNode));
      neighbors.add(hoveredNode);

      setSettings({
        nodeReducer: (node, data) => {
          if (neighbors.has(node)) {
            return {
              ...data,
              highlighted: true,
              size: data.size * 1.3,
              zIndex: 1
            };
          } else {
            return {
              ...data,
              color: '#ddd',
              size: data.size * 0.7,
              zIndex: 0
            };
          }
        },
        edgeReducer: (edge, data) => {
          const [source, target] = graph.extremities(edge);
          if (neighbors.has(source) && neighbors.has(target)) {
            return {
              ...data,
              color: '#e74c3c',
              size: data.size * 1.5,
              zIndex: 1
            };
          } else {
            return {
              ...data,
              color: '#eee',
              size: data.size * 0.4,
              zIndex: 0
            };
          }
        }
      });
    } else {
      setSettings({
        nodeReducer: null,
        edgeReducer: null
      });
    }
  }, [hoveredNode, enableHoverEffects, sigma, setSettings]);

  // Register event handlers
  useEffect(() => {
    registerEvents({
      enterNode: (event) => {
        setHoveredNode(event.node);
        onNodeHover?.(event.node);
        sigma.getContainer().style.cursor = 'pointer';
      },
      leaveNode: () => {
        setHoveredNode(null);
        onNodeHover?.(null);
        sigma.getContainer().style.cursor = 'default';
      },
      clickNode: (event) => {
        const graph = sigma.getGraph();
        const nodeAttributes = graph.getNodeAttributes(event.node);
        onNodeClick?.(event.node, nodeAttributes.metadata);
      },
      clickEdge: onEdgeClick ? (event) => {
        const graph = sigma.getGraph();
        const edgeAttributes = graph.getEdgeAttributes(event.edge);
        onEdgeClick?.(event.edge, edgeAttributes.metadata);
      } : undefined,
      clickStage: () => {
        setHoveredNode(null);
        onNodeHover?.(null);
      }
    });
  }, [registerEvents, onNodeClick, onEdgeClick, onNodeHover, sigma]);

  return null;
};

// Main graph component
export const GraphComponent: FC<GraphComponentProps> = ({
  data,
  width = '100%',
  height = '600px',
  settings = {},
  enableAnimation = true,
  enableHoverEffects = true,
  onNodeClick,
  onEdgeClick,
  onNodeHover,
  className,
  style
}) => {
  const [isLayoutRunning, setIsLayoutRunning] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  
  const mergedSettings = { ...defaultSettings, ...settings };

  const handleNodeHover = (nodeId: string | null) => {
    setHoveredNode(nodeId);
    onNodeHover?.(nodeId);
  };

  return (
    <div className={className} style={style}>
      <SigmaContainer
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
          border: '1px solid #ddd',
          borderRadius: '8px',
          backgroundColor: '#fafafa'
        }}
        settings={{
          defaultNodeColor: '#3498db',
          defaultEdgeColor: '#95a5a6',
          enableEdgeEvents: true,
          renderEdgeLabels: true,
          edgeLabelFont: 'Arial, sans-serif',
          edgeLabelSize: 12,
          edgeLabelWeight: 'normal',
          edgeLabelColor: { color: '#666' },
          labelFont: 'Arial, sans-serif',
          labelSize: 14,
          labelWeight: 'bold',
          allowInvalidContainer: true
        }}
      >
        <GraphLoader data={data} />
        <ForceAtlas2Layout 
          settings={mergedSettings} 
          enableAnimation={enableAnimation}
          onLayoutChange={setIsLayoutRunning}
        />
        <GraphInteractions
          enableHoverEffects={enableHoverEffects}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onNodeHover={handleNodeHover}
        />
      </SigmaContainer>
    </div>
  );
};
