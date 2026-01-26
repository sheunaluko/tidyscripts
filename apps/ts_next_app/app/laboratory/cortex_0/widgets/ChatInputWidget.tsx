'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Box, IconButton, useTheme } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import WidgetItem from '../WidgetItem';
import * as tsw from "tidyscripts_web";

const logger = tsw.common.logger;
const log = logger.get_logger({ id: "cortex:ChatInputWidget" });

interface ChatInputWidgetProps {
  onSubmit: (text: string) => void;
  fullscreen?: boolean;
  onFocus?: () => void;
  onClose?: () => void;
}

let renderCount = 0;

const ChatInputWidget: React.FC<ChatInputWidgetProps> = ({
  onSubmit,
  fullscreen = false,
  onFocus,
  onClose,
}) => {
  renderCount++;
  log(`[DEBUG] ChatInputWidget render #${renderCount}, fullscreen: ${fullscreen}`);

  const [input, setInput] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  // Monitor DOM mutations in this widget
  useEffect(() => {
    log(`[DEBUG] ChatInputWidget mounted/updated`);

    if (!containerRef.current) return;

    let addCount = 0;
    let removeCount = 0;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        addCount += mutation.addedNodes.length;
        removeCount += mutation.removedNodes.length;

        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as Element;
              log(`[DOM-LEAK] ChatInput added: ${el.tagName}.${el.className || ''}`);
            }
          });
        }
      });
    });

    observer.observe(containerRef.current, {
      childList: true,
      subtree: true
    });

    const interval = setInterval(() => {
      if (addCount > 0 || removeCount > 0) {
        log(`[DOM-LEAK] ChatInput mutations: +${addCount} -${removeCount} = ${addCount - removeCount}`);
        addCount = 0;
        removeCount = 0;
      }
    }, 3000);

    return () => {
      observer.disconnect();
      clearInterval(interval);
      log(`[DEBUG] ChatInputWidget unmounted`);
    };
  }, [fullscreen]);

  const handleSend = () => {
    if (input.trim()) {
      onSubmit(input.trim());
      setInput(''); // Clear input after sending
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <WidgetItem
      title="Chat Input"
      fullscreen={fullscreen}
      onFocus={onFocus}
      onClose={onClose}
    >
      <Box
        ref={containerRef}
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 1,
          height: '100%',
          p: 1,
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          rows={1}
          style={{
            width: '100%',
            minHeight: '45px',
            maxHeight: fullscreen ? '300px' : '100px',
            padding: '10px 14px',
            borderRadius: '12px',
            border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)'}`,
            fontFamily: theme.typography.fontFamily,
            fontSize: '14px',
            resize: 'vertical',
            outline: 'none',
            backgroundColor: 'transparent',
            color: theme.palette.text.primary,
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = theme.palette.primary.main;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)';
          }}
        />
        <IconButton
          onClick={handleSend}
          disabled={!input.trim()}
          color="primary"
          sx={{
            width: 40,
            height: 40,
          }}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </WidgetItem>
  );
};

export default React.memo(ChatInputWidget);
