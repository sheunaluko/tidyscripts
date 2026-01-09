'use client';

import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import * as tsw from 'tidyscripts_web';

declare var window: any;
declare var Bokeh: any;

const log = tsw.common.logger.get_logger({ id: 'tivi-viz' });

interface VizComponentProps {
  audioLevel: number;
}

// Visualization parameters
const VIZ_N = 50; // Number of points
const VIZ_S = 0.03; // Base spread

/**
 * Generate gaussian-distributed x,y coordinates
 */
function x_y_gaussian(n: number, sigma_x: number, sigma_y: number): { x: number[]; y: number[] } {
  const x: number[] = [];
  const y: number[] = [];

  for (let i = 0; i < n; i++) {
    // Generate two uniform random numbers between 0 and 1
    const u1 = Math.random();
    const u2 = Math.random();

    // Use Box-Muller transform to obtain two independent standard normal random numbers
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);

    // Scale by the specified standard deviations
    x.push(z0 * sigma_x);
    y.push(z1 * sigma_y);
  }

  return { x, y };
}

/**
 * Create a Bokeh scatter plot for visualization
 */
function createVizPlot(bgc: string) {
  const x = [0];
  const y = [0];
  const source = new Bokeh.ColumnDataSource({ data: { x, y } });

  const ops: any = {
    width: 300,
    height: 100,
    outline_line_color: null,
  };

  ops.y_range = new Bokeh.Range1d({ start: -1, end: 1 });
  ops.x_range = new Bokeh.Range1d({ start: -1, end: 1 });

  const plot = new Bokeh.Plot(ops);
  plot.background_fill_color = bgc;
  plot.border_fill_color = bgc;

  plot.toolbar.logo = null;
  plot.toolbar_location = null;

  // Add circle glyph
  const circle = new Bokeh.Circle({
    x: { field: 'x' },
    y: { field: 'y' },
    line_color: '#34eb49',
    fill_color: '#34eb49',
    size: 6,
  });
  plot.add_glyph(circle, source);

  return { plot, source };
}

/**
 * VizComponent - Audio level visualization using Bokeh
 */
export const VizComponent: React.FC<VizComponentProps> = ({ audioLevel }) => {
  const theme = useTheme();
  const sourceRef = useRef<any>(null);
  const initializingRef = useRef(false);

  // Initialize Bokeh plot
  useEffect(() => {
    if (initializingRef.current) return;
    initializingRef.current = true;

    async function initViz() {
      try {
        log('Initializing Bokeh visualization...');

        // Load Bokeh scripts if not already loaded
        if (!window.Bokeh) {
          await tsw.apis.bokeh.load_bokeh_scripts();
        }

        if (!window.Bokeh) {
          log('Bokeh failed to load');
          return;
        }

        // Create the plot
        const bgc = theme.palette.background.default;
        const { plot, source } = createVizPlot(bgc);
        sourceRef.current = source;

        // Render the plot
        const vizElement = document.getElementById('tivi-viz');
        if (vizElement) {
          Bokeh.Plotting.show(plot, vizElement);
          log('Visualization initialized');
        }
      } catch (error) {
        console.error('[tivi-viz] Failed to initialize:', error);
      }
    }

    initViz();

    return () => {
      initializingRef.current = false;
    };
  }, [theme.palette.background.default]);

  // Update visualization based on audio level
  useEffect(() => {
    if (!sourceRef.current) return;

    try {
      // Generate new gaussian data based on audio level
      const spread = audioLevel + VIZ_S;
      const new_data = x_y_gaussian(VIZ_N, spread, spread);

      // Stream new data to the plot
      sourceRef.current.stream(new_data, VIZ_N);
    } catch (error) {
      // Silently ignore streaming errors (can happen during rapid updates)
    }
  }, [audioLevel]);

  return (
    <Box
      id="tivi-viz"
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 120,
      }}
    />
  );
};

export default VizComponent;
