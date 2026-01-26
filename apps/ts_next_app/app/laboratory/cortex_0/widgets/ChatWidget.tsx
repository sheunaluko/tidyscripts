'use client';

import React, { useRef, useEffect } from 'react';
import { Box, alpha } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { List } from 'react-window';
import WidgetItem from '../WidgetItem';
import { theme } from '../../../theme';
import * as tsw from "tidyscripts_web";

const logger = tsw.common.logger;
const log = logger.get_logger({ id: "cortex:ChatWidget" });

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
  log(`[DEBUG] ChatWidget render, chatHistory.length: ${chatHistory.length}`);
  const listRef = useRef<any>(null);
  const messages = chatHistory.slice(1); // Exclude system message

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    log(`[DEBUG] Auto-scroll effect triggered, messages.length: ${messages.length}`);
    if (listRef.current && messages.length > 0) {
      listRef.current.scrollToRow({ index: messages.length - 1, align: 'end' });
    }
  }, [messages.length]);

  const ChatRow = ({ index, style, messages: msgs }: { index: number; style: React.CSSProperties; messages: ChatMessage[] }) => {
    const message = msgs[index];
    if (!message) return null;

    return (
      <Box
        style={style}
        sx={{
          display: 'flex',
          justifyContent: message.role === 'user' ? 'flex-start' : 'flex-end',
          alignItems: 'flex-start',
          px: 1,
          py: 0.5
        }}
      >
        <Box
          sx={{
            padding: '8px',
            borderRadius: '8px',
            backgroundColor: message.role === 'assistant' ? light_primary : light_secondary,
            border: message.role === 'user' ? '1px solid' : '1px solid',
            borderColor: message.role === 'user' ? 'secondary.main' : 'primary.main',
            color: message.role === 'assistant' ? 'inherit' : 'inherit',
            overflow: 'hidden',
            wordBreak: 'break-word',
            maxWidth: '85%',
            '& ul, & ol': {
              marginLeft: '20px',
              paddingLeft: '0',
              marginTop: '4px',
              marginBottom: '4px'
            },
            '& p': {
              margin: '4px 0',
              whiteSpace: 'pre-wrap'
            }
          }}
        >
          <ReactMarkdown className="line-break">
            {message.content}
          </ReactMarkdown>
        </Box>
      </Box>
    );
  };

  return (
    <WidgetItem
      title="Chat"
      fullscreen={fullscreen}
      onFocus={onFocus}
      onClose={onClose}
    >
      <Box id="chat_display">
        <List
          listRef={listRef}
          rowComponent={ChatRow}
          rowCount={messages.length}
          rowHeight={80}
          rowProps={{ messages } as any}
          style={{
            height: fullscreen ? window.innerHeight - 150 : 280,
            width: '100%',
            scrollbarWidth: 'none'
          }}
        />
      </Box>
    </WidgetItem>
  );
};

export default React.memo(ChatWidget);
