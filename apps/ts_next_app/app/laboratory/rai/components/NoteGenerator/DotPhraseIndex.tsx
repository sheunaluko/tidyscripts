// Dot Phrase Index Component - Scrollable, searchable reference list

import React, { useState, useMemo } from 'react';
import { Box, TextField, Typography, List, ListItem, Divider, Paper } from '@mui/material';
import { Search } from '@mui/icons-material';
import { useRaiStore } from '../../store/useRaiStore';

export const DotPhraseIndex: React.FC = () => {
  const { dotPhrases } = useRaiStore();
  const [searchTerm, setSearchTerm] = useState('');

  // Filter and sort dot phrases
  const filteredPhrases = useMemo(() => {
    const filtered = dotPhrases.filter(dp => {
      const search = searchTerm.toLowerCase();
      return (
        dp.title.toLowerCase().includes(search) ||
        dp.description?.toLowerCase().includes(search)
      );
    });
    return filtered.sort((a, b) => a.title.localeCompare(b.title));
  }, [dotPhrases, searchTerm]);

  return (
    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Typography variant="h6" gutterBottom sx={{ flexShrink: 0 }}>
        Dot Phrases
      </Typography>

      {/* Search Field */}
      <TextField
        size="small"
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
        }}
        sx={{ mb: 2, flexShrink: 0 }}
      />

      {/* Scrollable List */}
      <Box sx={{ flexGrow: 1, flexShrink: 1, overflow: 'auto', minHeight: 0 }}>
        {filteredPhrases.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            {searchTerm ? 'No matching dot phrases' : 'No dot phrases created yet'}
          </Typography>
        ) : (
          <List dense disablePadding>
            {filteredPhrases.map((dp, index) => (
              <React.Fragment key={dp.id}>
                {index > 0 && <Divider />}
                <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 1 }}>
                  {/* Description first if present */}
                  {dp.description && (
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                      {dp.description}
                    </Typography>
                  )}

                  {/* Normalized title (the trigger) */}
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                      color: 'primary.main'
                    }}
                  >
                    .{dp.titleNormalized}
                  </Typography>

                  {/* Phrase preview (truncated) */}
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      mt: 0.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {dp.phrase}
                  </Typography>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>

      {/* Count indicator */}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, textAlign: 'center', flexShrink: 0 }}>
        {filteredPhrases.length} of {dotPhrases.length} phrases
      </Typography>
    </Paper>
  );
};
