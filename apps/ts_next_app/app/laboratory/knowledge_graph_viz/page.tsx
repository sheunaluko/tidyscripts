'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { GraphData } from '../graph/md_graph';

const GraphComponent = dynamic(() => import('../graph/md_graph').then(mod => ({ default: mod.GraphComponent })), {
  ssr: false,
  loading: () => <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>Loading graph...</div>
});


import { convertSurrealToSigmaEnhanced } from '../graph/graph_utils';
import * as common from "tidyscripts_common";

const {debug} = common.util ;
const log = common.logger.get_logger({id:'kgv'}) ;

// Transform search text for SurrealDB queries
const text_transform = (text: string): string => {
  return text.toLowerCase().replace(/\s+/g, '_');
}; 

// Dummy data representing TidyScripts architecture
const dummyTidyScriptsData = [
  {
    eid: "tidyscripts_common",
    outgoing_edges: [
      {
        id: "common_to_node",
        in: "entity:tidyscripts_common", 
        out: "entity:tidyscripts_node",
        rid: "tidyscripts_common->provides_base_for->tidyscripts_node"
      },
      {
        id: "common_to_web",
        in: "entity:tidyscripts_common",
        out: "entity:tidyscripts_web", 
        rid: "tidyscripts_common->provides_base_for->tidyscripts_web"
      }
    ],
    outgoing_nodes: [
      {
        category: "package",
        eid: "tidyscripts_node"
      },
      {
        category: "package", 
        eid: "tidyscripts_web"
      }
    ]
  },
  {
    eid: "tidyscripts_node",
    outgoing_edges: [
      {
        id: "node_to_app",
        in: "entity:tidyscripts_node",
        out: "entity:app",
        rid: "tidyscripts_node->powers->app"
      }
    ],
    outgoing_nodes: [
      {
        category: "application",
        eid: "app"
      }
    ]
  },
  {
    eid: "tidyscripts_web", 
    outgoing_edges: [
      {
        id: "web_to_app",
        in: "entity:tidyscripts_web",
        out: "entity:app",
        rid: "tidyscripts_web->powers->app"
      }
    ],
    outgoing_nodes: [
      {
        category: "application",
        eid: "app"
      }
    ]
  },
  {
    eid: "app",
    outgoing_edges: [
      {
        id: "app_to_vercel",
        in: "entity:app", 
        out: "entity:vercel",
        rid: "app->deployed_on->vercel"
      }
    ],
    outgoing_nodes: [
      {
        category: "platform",
        eid: "vercel"
      }
    ]
  },
  {
    eid: "vercel",
    outgoing_edges: [
      {
        id: "vercel_to_you",
        in: "entity:vercel",
        out: "entity:you", 
        rid: "vercel->serves->you"
      }
    ],
    outgoing_nodes: [
      {
        category: "user",
        eid: "you"
      }
    ]
  }
];

const KnowledgeGraphViz: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load dummy data initially
  useEffect(() => {
    const initialData = convertSurrealToSigmaEnhanced(dummyTidyScriptsData, {
      baseNodeSize: 20,
      maxNodeSize: 40,
      useConnectionSizing: true
    });
      setGraphData(initialData);

      Object.assign(window, {
	  common 
      })
      
  }, []);

  const handleSearch = async () => {
    if (!searchText.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {

      const transformedText = text_transform(searchText);
      log(`Searching using text: ${searchText} -> transformed: ${transformedText}`)
      
      const tmp = await common.tes.cloud.node.tom.all_relationships_for_entity(transformedText) as any ;
      debug.add('tmp', tmp) ; 
      const result = tmp.result[1][0] ;
      debug.add('result' , result) ; 
      
      // Convert the result to an array if it's a single object
      const dataArray = Array.isArray(result) ? result : [result];
      
      const convertedData = convertSurrealToSigmaEnhanced(dataArray, {
        baseNodeSize: 20,
        maxNodeSize: 40,
        useConnectionSizing: true
      });

      debug.add('converted_data', convertedData) ; 
      
      setGraphData(convertedData);
    } catch (err) {
      console.error('Search error:', err);
      setError(`Failed to search for entity: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f8f9fa'
      }}
    >
      {/* Header */}
      <div
        style={{
          textAlign: 'center',
          padding: '20px 0 10px 0',
          backgroundColor: 'white',
          borderBottom: '1px solid #e9ecef',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        <h1
          style={{
            margin: '0',
            fontSize: '28px',
            fontWeight: '600',
            color: '#2c3e50'
          }}
        >
	    Nova | Medical Visualizer 
        </h1>
      </div>

      {/* Search Bar */}
      <div
        style={{
          padding: '20px',
          backgroundColor: 'white',
          borderBottom: '1px solid #e9ecef'
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '12px',
            maxWidth: '800px',
            margin: '0 auto',
            alignItems: 'center'
          }}
        >
          <input
            type="text"
            placeholder="Enter entity name to explore relationships..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '2px solid #3498db',
              borderRadius: '4px',
              backgroundColor: 'white',
              color: '#2c3e50',
              outline: 'none'
            }}
          />
          <button
            onClick={handleSearch}
            disabled={isLoading || !searchText.trim()}
            style={{
              minWidth: '120px',
              height: '48px',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            {isLoading ? 'Loading...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div style={{ padding: '0 20px', paddingTop: '10px' }}>
          <div
            style={{
              maxWidth: '800px',
              margin: '0 auto',
              padding: '12px',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              border: '1px solid #f5c6cb',
              borderRadius: '4px'
            }}
          >
            {error}
            <button
              onClick={() => setError(null)}
              style={{
                float: 'right',
                background: 'none',
                border: 'none',
                color: '#721c24',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Graph Canvas */}
      <div
        style={{
          flex: 1,
          padding: '20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '500px'
        }}
      >
        {graphData && (
          <GraphComponent
            data={graphData}
            width="100%"
            height="100%"
            settings={{
	      gravity: 0.0001,
              scalingRatio: 300,
              edgeWeightInfluence: 0,
              slowDown: 1000,
	      adjustSizes : false ,
	      strongGravityMode : false, 
              animationDuration: 8000,
	      linLogMode : false, 
              outboundAttractionDistribution: false, 
            }}
            enableAnimation={true}
            enableHoverEffects={true}
            onNodeClick={(nodeId, metadata) => {
              console.log('Node clicked:', nodeId, metadata);
            }}
            onEdgeClick={(edgeId, metadata) => {
              console.log('Edge clicked:', edgeId, metadata);
            }}
            style={{
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              width: '100%',
              height: '100%'
            }}
          />
        )}
      </div>

      {/* Graph Info */}
      {graphData && (
        <div
          style={{
            textAlign: 'center',
            padding: '15px',
            color: '#7f8c8d',
            fontSize: '14px',
            backgroundColor: 'white',
            borderTop: '1px solid #e9ecef'
          }}
        >
          <strong>Knowledge Graph</strong> • {graphData.nodes.length} entities • {graphData.edges.length} relationships
        </div>
      )}
    </div>
  );
};

export default KnowledgeGraphViz;
