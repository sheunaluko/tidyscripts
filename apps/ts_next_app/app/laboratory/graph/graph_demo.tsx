'use client';

import React, { useState } from 'react';
import { GraphComponent, GraphData } from './graph';
import { graphDatasets } from './graph_data';

const GraphDemo: React.FC = () => {
  const [selectedDataset, setSelectedDataset] = useState<string>('System Architecture');
  const [currentData, setCurrentData] = useState<GraphData>(graphDatasets['System Architecture']);

  const handleDatasetChange = (datasetName: string) => {
    setSelectedDataset(datasetName);
    setCurrentData(graphDatasets[datasetName as keyof typeof graphDatasets]);
  };

  const handleNodeClick = (nodeId: string, metadata?: Record<string, any>) => {
    console.log('Node clicked:', nodeId);
    if (metadata) {
      console.log('Node metadata:', metadata);
      alert(`${nodeId}\n\n${JSON.stringify(metadata, null, 2)}`);
    }
  };

  const handleEdgeClick = (edgeId: string, metadata?: Record<string, any>) => {
    console.log('Edge clicked:', edgeId);
    if (metadata) {
      console.log('Edge metadata:', metadata);
      alert(`Edge: ${edgeId}\n\n${JSON.stringify(metadata, null, 2)}`);
    }
  };

  const handleNodeHover = (nodeId: string | null) => {
    // Optional: Add hover feedback
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#f8f9fa'
    }}>
      {/* Header */}
      <div style={{ 
        textAlign: 'center', 
        padding: '20px 0 10px 0',
        backgroundColor: 'white',
        borderBottom: '1px solid #e9ecef',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ 
          margin: '0', 
          fontSize: '28px', 
          fontWeight: '600',
          color: '#2c3e50'
        }}>
          Interactive Graph Visualization
        </h1>
      </div>

      {/* Main Content Area with 10% margins */}
      <div style={{ 
        flex: 1,
        margin: '0 10%',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 0'
      }}>
        {/* Dataset Selection Buttons */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}>
          {Object.keys(graphDatasets).map((datasetName) => (
            <button
              key={datasetName}
              onClick={() => handleDatasetChange(datasetName)}
              style={{
                padding: '10px 20px',
                backgroundColor: selectedDataset === datasetName ? '#3498db' : 'white',
                color: selectedDataset === datasetName ? 'white' : '#2c3e50',
                border: '2px solid #3498db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                minWidth: '120px'
              }}
              onMouseOver={(e) => {
                if (selectedDataset !== datasetName) {
                  e.currentTarget.style.backgroundColor = '#ecf0f1';
                }
              }}
              onMouseOut={(e) => {
                if (selectedDataset !== datasetName) {
                  e.currentTarget.style.backgroundColor = 'white';
                }
              }}
            >
              {datasetName}
            </button>
          ))}
        </div>

        {/* Graph Container */}
        <div style={{ 
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '600px'
        }}>
          <GraphComponent
            key={selectedDataset} // Force re-render on dataset change
            data={currentData}
            width="100%"
            height="100%"
            settings={{
              gravity: 1,
              scalingRatio: 2,
              edgeWeightInfluence: 0,
              slowDown: 50,
              animationDuration: 8000,
              outboundAttractionDistribution: false
            }}
            enableAnimation={true}
            enableHoverEffects={true}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            onNodeHover={handleNodeHover}
            style={{
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
	      width : "100%",
	      height : "100%" , 
            }}
          />
        </div>

        {/* Dataset Info */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: '15px',
          color: '#7f8c8d',
          fontSize: '14px'
        }}>
          <strong>{selectedDataset}</strong> • {currentData.nodes.length} nodes • {currentData.edges.length} edges
        </div>
      </div>
    </div>
  );
};

export default GraphDemo;
