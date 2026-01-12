'use client';

import React from 'react';
import { Box, alpha } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import WidgetItem from '../WidgetItem';
import { theme } from '../../../theme';

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatWidgetProps {
  fullscreen?: boolean;
  onFocus?: () => void;
  onClose?: () => void;
  chatHistory: ChatMessage[];
}

const alpha_val = 0.4;
const light_primary = alpha(theme.palette.primary.main, alpha_val);
const light_secondary = alpha(theme.palette.secondary.main, alpha_val);

const ChatWidget: React.FC<ChatWidgetProps> = ({
  fullscreen = false,
  onFocus,
  onClose,
  chatHistory
}) => {
  const widget_scroll_styles = {
    overflowY: 'auto',
    maxHeight: '95%',
    scrollbarWidth: 'none',         // Firefox
    '&::-webkit-scrollbar': {
      display: 'none',              // Chrome, Safari
    }
  };

  return (
    <WidgetItem
      title="Chat"
      fullscreen={fullscreen}
      onFocus={onFocus}
      onClose={onClose}
    >
      <Box id="chat_display" sx={widget_scroll_styles}>
        {chatHistory.slice(1).map((message, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-start' : 'flex-end',
              marginBottom: '10px'
            }}
          >
            <Box
              sx={{
                padding: '8px',
                borderRadius: '8px',
                backgroundColor: message.role === 'assistant' ? light_primary : light_secondary,
                border: message.role === 'user' ? '1px solid' : '1px solid',
                borderColor: message.role === 'user' ? 'secondary.main' : 'primary.main',
                color: message.role === 'assistant' ? 'inherit' : 'inherit'
              }}
            >
              <ReactMarkdown>
                {message.content}
              </ReactMarkdown>
            </Box>
          </Box>
        ))}
      </Box>
    </WidgetItem>
  );
};

export default React.memo(ChatWidget);
