'use client'

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import * as tsw from "tidyscripts_web";
import {
  Box,
  Button,
  TextField,
  Paper,
  Typography,
  Chip,
  AppBar,
  Toolbar,
  Container,
  Card,
  CardContent,
  Divider,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import CircleIcon from '@mui/icons-material/Circle';

const bokeh = tsw.apis.bokeh;

// Dynamically import react-inspector to avoid SSR issues
const ObjectInspector = dynamic(
  () => import('react-inspector').then(mod => mod.ObjectInspector),
  { ssr: false }
);

declare var Bokeh: any;
declare var window: any;

interface Message {
  type: 'bar_chart' | 'time_series_chart' | 'object';
  title?: string;
  x?: any[];
  y?: any[];
  data?: any;
  timestamp: number;
}

interface DisplayItem {
  id: string;
  type: string;
  content: any;
}

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4A90E2',
    },
    secondary: {
      main: '#E94B3C',
    },
  },
});

// Separate component for bar charts
const BarChart: React.FC<{ item: DisplayItem; bokehLoaded: boolean }> = ({ item, bokehLoaded }) => {
  const containerId = `bokeh-${item.id}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);

  useEffect(() => {
    if (!bokehLoaded || typeof Bokeh === 'undefined') return;
    if (!containerRef.current) return;
    if (renderedRef.current) return;

    const { title = 'Bar Chart', x = [], y = [] } = item.content;

    try {
      const categories = x.map(String);

      const source = new Bokeh.ColumnDataSource({
        data: { categories: categories, values: y }
      });

      // Use figure() like Python example
      const p = Bokeh.Plotting.figure({
        title: title,
        x_range: categories,
        width: containerRef.current.offsetWidth - 40,
        height: 400,
        toolbar_location: null,
      });

      // Add vbar with field objects
      p.vbar({
        x: { field: 'categories' },
        top: { field: 'values' },
        width: 0.8,
        source: source,
        fill_color: "#4A90E2",
        line_color: "#2E5C8A"
      });


      p.y_range.start = 0;

      Bokeh.Plotting.show(p, containerRef.current);
      renderedRef.current = true;
    } catch (error) {
      console.error('Error rendering bar chart:', error);
    }
  }, [bokehLoaded, item.id]);

  return <div ref={containerRef} id={containerId} style={{ width: '100%', minHeight: '400px' }} />;
};

// Separate component for time series charts
const TimeSeriesChart: React.FC<{ item: DisplayItem; bokehLoaded: boolean }> = ({ item, bokehLoaded }) => {
  const containerId = `bokeh-${item.id}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);

  useEffect(() => {
    if (!bokehLoaded || typeof Bokeh === 'undefined') return;
    if (!containerRef.current) return;
    if (renderedRef.current) return;

    const { title = 'Time Series Chart', x = [], y = [] } = item.content;

    try {
      const source = new Bokeh.ColumnDataSource({
        data: { x: x, y: y }
      });

      const plot = new Bokeh.Plot({
        title: title,
        width: containerRef.current.offsetWidth - 40,
        height: 400,
      });

      const xaxis = new Bokeh.LinearAxis();
      const yaxis = new Bokeh.LinearAxis();
      plot.add_layout(xaxis, "below");
      plot.add_layout(yaxis, "left");

      const xgrid = new Bokeh.Grid({ ticker: xaxis.ticker, dimension: 0 });
      const ygrid = new Bokeh.Grid({ ticker: yaxis.ticker, dimension: 1 });
      plot.add_layout(xgrid);
      plot.add_layout(ygrid);

      const line = new Bokeh.Line({
        x: { field: "x" },
        y: { field: "y" },
        line_color: "#4A90E2",
        line_width: 2
      });

      plot.add_glyph(line, source);

      Bokeh.Plotting.show(plot, containerRef.current);
      renderedRef.current = true;
    } catch (error) {
      console.error('Error rendering time series chart:', error);
    }
  }, [bokehLoaded, item.id]);

  return <div ref={containerRef} id={containerId} style={{ width: '100%', minHeight: '400px' }} />;
};

// Separate component for object display
const ObjectDisplay: React.FC<{ item: DisplayItem }> = ({ item }) => {
  return (
    <Box sx={{
      bgcolor: 'grey.900',
      p: 3,
      borderRadius: 1,
      overflow: 'auto',
      maxHeight: '600px'
    }}>
      <ObjectInspector data={item.content.data} expandLevel={2} theme="chromeDark" />
    </Box>
  );
};

export default function Tobi() {
  const [url, setUrl] = useState('localhost');
  const [port, setPort] = useState('8002');
  const [isConnected, setIsConnected] = useState(false);
  const [displayItems, setDisplayItems] = useState<DisplayItem[]>([]);
  const [status, setStatus] = useState('Disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const [bokehLoaded, setBokehLoaded] = useState(false);

  // Load Bokeh scripts on mount
  useEffect(() => {
    const loadBokeh = async () => {
      if (bokehLoaded) return;

      try {
        await bokeh.load_bokeh_scripts();
        setBokehLoaded(true);
        console.log('Bokeh loaded successfully');
      } catch (error) {
        console.error('Failed to load Bokeh:', error);
      }
    };

    loadBokeh();
  }, []);

  const connect = () => {
    try {
      const wsUrl = `ws://${url}:${port}`;
      setStatus('Connecting...');

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        setStatus('Connected');
        console.log('Connected to WebSocket server');
      };

      ws.onmessage = (event) => {
        try {
          const message: Message = JSON.parse(event.data);
          console.log('Received message:', message);
          handleMessage(message);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('Error');
      };

      ws.onclose = () => {
        setIsConnected(false);
        setStatus('Disconnected');
        console.log('Disconnected from WebSocket server');
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect:', error);
      setStatus('Connection failed');
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const handleMessage = (message: Message) => {
    const item: DisplayItem = {
      id: `${message.type}-${Date.now()}`,
      type: message.type,
      content: message
    };

    setDisplayItems(prev => [...prev, item]);
  };

  const clearAll = () => {
    setDisplayItems([]);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'bar_chart': return 'Bar Chart';
      case 'time_series_chart': return 'Time Series';
      case 'object': return 'Object';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'bar_chart': return 'primary';
      case 'time_series_chart': return 'secondary';
      case 'object': return 'success';
      default: return 'default';
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'grey.900' }}>
        {/* Header AppBar */}
        <AppBar position="static" elevation={2}>
          <Toolbar>
            <Typography variant="h5" component="div" sx={{ flexGrow: 0, mr: 3, fontWeight: 'bold' }}>
              TOBI
            </Typography>
            <Typography variant="body2" sx={{ flexGrow: 1, opacity: 0.7 }}>
              Tidyscripts Observability Interface
            </Typography>

            {/* Connection Controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TextField
                size="small"
                label="URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isConnected}
                sx={{ width: 160 }}
              />
              <TextField
                size="small"
                label="Port"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                disabled={isConnected}
                sx={{ width: 100 }}
              />
              <Button
                variant="contained"
                color={isConnected ? 'error' : 'primary'}
                onClick={isConnected ? disconnect : connect}
              >
                {isConnected ? 'Disconnect' : 'Connect'}
              </Button>
              <Chip
                icon={<CircleIcon sx={{ fontSize: 12 }} />}
                label={status}
                color={isConnected ? 'success' : 'default'}
                variant="outlined"
              />
              {displayItems.length > 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={clearAll}
                  sx={{ ml: 2 }}
                >
                  Clear All
                </Button>
              )}
            </Box>
          </Toolbar>
        </AppBar>

        {/* Main Content Area */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
          {displayItems.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 'calc(100vh - 200px)',
                }}
              >
                <Paper
                  elevation={3}
                  sx={{
                    p: 6,
                    textAlign: 'center',
                    bgcolor: 'grey.800',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="h6" color="text.secondary">
                    Connect to the WebSocket server to start receiving visualizations
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Default: ws://localhost:8002
                  </Typography>
                </Paper>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {displayItems.map((item) => (
                  <Card
                    key={item.id}
                    elevation={4}
                    sx={{
                      width: '100%',
                      bgcolor: 'grey.800',
                      border: '1px solid',
                      borderColor: 'grey.700',
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Chip
                          label={getTypeLabel(item.type)}
                          color={getTypeColor(item.type) as any}
                          size="small"
                          sx={{ mr: 2 }}
                        />
                        {item.content.title && (
                          <Typography variant="h6" component="div">
                            {item.content.title}
                          </Typography>
                        )}
                        <Box sx={{ flexGrow: 1 }} />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(item.content.timestamp).toLocaleTimeString()}
                        </Typography>
                      </Box>
                      <Divider sx={{ mb: 2 }} />
                      {item.type === 'bar_chart' && (
                        <BarChart item={item} bokehLoaded={bokehLoaded} />
                      )}
                      {item.type === 'time_series_chart' && (
                        <TimeSeriesChart item={item} bokehLoaded={bokehLoaded} />
                      )}
                      {item.type === 'object' && <ObjectDisplay item={item} />}
                    </CardContent>
                  </Card>
                ))}
            </Box>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
