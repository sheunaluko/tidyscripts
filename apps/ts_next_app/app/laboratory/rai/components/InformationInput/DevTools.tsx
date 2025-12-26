// DevTools Component - Developer tools widget for voice agent debugging

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  ExpandMore,
  Send,
  Clear,
  BugReport,
  Lightbulb,
} from '@mui/icons-material';
import { useRaiStore } from '../../store/useRaiStore';

declare var window: any;

export const DevTools: React.FC = () => {
  const { toolCallThoughts, clearToolCallThoughts, voiceAgentConnected } = useRaiStore();
  const [message, setMessage] = useState('');
  const [expanded, setExpanded] = useState(true);
  const thoughtsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new thoughts arrive
  useEffect(() => {
    if (expanded) {
      thoughtsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [toolCallThoughts, expanded]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    try {
      // Access the session from the global window object (exposed by useVoiceAgent)
      const session = window.voiceAgentDebug?.session;

      if (!session) {
        console.error('No active voice agent session found');
        return;
      }

      // Send message to the realtime agent (same method used for initialization)
      session.transport.sendMessage(message.trim(), {});
      console.log('Sent message to agent:', message.trim());

      // Clear the input
      setMessage('');
    } catch (error) {
      console.error('Error sending message to agent:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        mb: 3,
        border: '2px solid',
        borderColor: 'warning.main',
        bgcolor: 'grey.900',
      }}
    >
      <Box
        sx={{
          p: 1.5,
          bgcolor: 'warning.main',
          color: 'warning.contrastText',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BugReport />
          <Typography variant="h6" fontWeight="bold">
            Dev Tools
          </Typography>
          <Chip
            label={voiceAgentConnected ? 'Active' : 'Inactive'}
            size="small"
            color={voiceAgentConnected ? 'success' : 'default'}
            sx={{ ml: 1 }}
          />
        </Box>
        <ExpandMore
          sx={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s',
          }}
        />
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ p: 2 }}>
          {/* Message Sender */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Send Message to Agent
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth
                size="small"
                placeholder="Type a message to send to the agent..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={!voiceAgentConnected}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'background.paper',
                  },
                }}
              />
              <Button
                variant="contained"
                endIcon={<Send />}
                onClick={handleSendMessage}
                disabled={!message.trim() || !voiceAgentConnected}
              >
                Send
              </Button>
            </Stack>
          </Box>

          {/* Agent Thoughts Display */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Lightbulb sx={{ color: 'warning.main' }} />
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                  Agent Thoughts ({toolCallThoughts.length})
                </Typography>
              </Box>
              {toolCallThoughts.length > 0 && (
                <IconButton
                  size="small"
                  onClick={clearToolCallThoughts}
                  sx={{ color: 'text.secondary' }}
                >
                  <Clear fontSize="small" />
                </IconButton>
              )}
            </Box>

            <Paper
              variant="outlined"
              sx={{
                maxHeight: 300,
                overflowY: 'auto',
                bgcolor: 'background.default',
                p: toolCallThoughts.length === 0 ? 3 : 1,
              }}
            >
              {toolCallThoughts.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  align="center"
                  sx={{ fontStyle: 'italic' }}
                >
                  No thoughts recorded yet. Thoughts will appear here when the agent uses tools.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {toolCallThoughts.map((thought, index) => (
                    <Accordion
                      key={index}
                      sx={{
                        bgcolor: 'background.paper',
                        '&:before': { display: 'none' },
                      }}
                      defaultExpanded={index === toolCallThoughts.length - 1}
                    >
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                          <Chip
                            label={thought.toolName}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                          <Typography variant="caption" color="text.secondary">
                            {thought.timestamp.toLocaleTimeString()}
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box>
                          <Typography
                            variant="body2"
                            sx={{
                              mb: 1,
                              whiteSpace: 'pre-wrap',
                              fontStyle: 'italic',
                              color: 'text.primary',
                            }}
                          >
                            {thought.thoughts}
                          </Typography>
                          {thought.parameters && Object.keys(thought.parameters).length > 0 && (
                            <Box
                              sx={{
                                mt: 1,
                                p: 1,
                                bgcolor: 'action.hover',
                                borderRadius: 1,
                              }}
                            >
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                                Parameters:
                              </Typography>
                              <Box
                                component="pre"
                                sx={{
                                  mt: 0.5,
                                  fontSize: '0.75rem',
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  fontFamily: 'monospace',
                                }}
                              >
                                {JSON.stringify(thought.parameters, null, 2)}
                              </Box>
                            </Box>
                          )}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                  <div ref={thoughtsEndRef} />
                </Stack>
              )}
            </Paper>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};
