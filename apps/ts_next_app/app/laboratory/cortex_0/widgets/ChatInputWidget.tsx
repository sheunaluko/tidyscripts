'use client';

import React, { useState } from 'react';
import { Box, TextField, IconButton } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import WidgetItem from '../WidgetItem';

interface ChatInputWidgetProps {
  onSubmit: (text: string) => void;
  fullscreen?: boolean;
  onFocus?: () => void;
  onClose?: () => void;
}

const ChatInputWidget: React.FC<ChatInputWidgetProps> = ({
  onSubmit,
  fullscreen = false,
  onFocus,
  onClose,
}) => {
  const [input, setInput] = useState('');

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
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 1,
          height: '100%',
          p: 1,
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={fullscreen ? 10 : 3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          variant="outlined"
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
            },
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

export default ChatInputWidget;
