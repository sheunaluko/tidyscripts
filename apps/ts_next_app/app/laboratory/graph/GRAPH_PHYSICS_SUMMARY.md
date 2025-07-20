 # Graph Physics Parameters for Sigma.js Visualizations

 This document summarizes how to configure and apply ForceAtlas2 physics
 in Sigma.js-based graph components to achieve smooth, interactive updates
 on node hover, data changes, and camera movements.

 ---

 ## 1. Default Physics Settings

 In the standalone `SimpleGraph` component, a default physics configuration
 object defines the core ForceAtlas2 parameters:

 ```ts
 const defaultPhysics = {
   gravity: 1,            // pull nodes toward canvas center
   scalingRatio: 2,       // balance between repulsion and attraction
   slowDown: 1000,        // inertia/cooling: higher values yield slower movement
   edgeWeightInfluence: 1 // how strongly edge weights affect forces
 };
 ```

 These values are passed to **graphology-layout-forceatlas2** when creating
 the layout engine, for example:

 ```ts
 const layout = new FA2Layout(graph, {
   settings: defaultPhysics
 });
 ```

 ---

 ## 2. Hover Interactions with skipIndexation

 To highlight nodes on hover without recomputing the entire spatial index,
 use Sigma.js’s `skipIndexation` flag in the `refresh()` call:

 ```ts
 sigma.on('enterNode', () => {
   // update node data, then:
   sigma.refresh({ skipIndexation: true });
 });
 ```

 This reduces CPU overhead and keeps hover feedback snappy.

 ---

 ## 3. Animated Camera Reset on Data Update

 After adding or removing nodes/edges, trigger a full `refresh()` followed by
 a slight delay before calling the camera’s `animatedReset()`:

 ```ts
 sigma.refresh();
 setTimeout(() => sigma.getCamera().animatedReset(), 100);
 ```

 This produces a smooth “fit-to-content” animation instead of a jarring jump.

 ---

 ## 4. Inline Preview Using ForceAtlas2 Worker + inferSettings

 In embedded or preview contexts (e.g. query result panes), you can spin up
 the worker-based supervisor from graphology-layout-forceatlas2 and leverage
 `inferSettings()` to auto-tune parameters based on graph size:

 ```ts
 const supervisor = new FA2LayoutSupervisor(displayGraph, {
   settings: {
     ...inferSettings(displayGraph), // auto-computed defaults
     edgeWeightInfluence: 1,
     scalingRatio: 2,
     slowDown: 2000
   }
 });
 supervisor.start();
 ```

 The increased `slowDown` value (e.g. 2000) smooths out layout transitions
 for larger or more dynamic graphs.

 ---

 ## Key ForceAtlas2 Parameters at a Glance

 | Parameter               | Description                                       |
 |-------------------------|---------------------------------------------------|
 | **gravity**             | Pull force toward canvas center                   |
 | **scalingRatio**        | Global repulsion/attraction balance               |
 | **slowDown**            | Cooling/inertia factor (higher = slower movement) |
 | **edgeWeightInfluence** | Edge-weight contribution to force calculation     |

 ## Default Values Comparison

 | Parameter             | SimpleGraph Defaults | Preview Override          |
 |-----------------------|----------------------|---------------------------|
 | gravity               | 1                    | (from inferSettings)      |
 | scalingRatio          | 2                    | 2                         |
 | slowDown              | 1000                 | 2000                      |
 | edgeWeightInfluence   | 1                    | 1                         |

 ---

 By applying these settings—along with the `skipIndexation` hover trick
 and animated camera resets—you can achieve fluid, responsive graph
 visualizations powered by Sigma.js across a variety of contexts.