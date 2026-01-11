/**
 * Voice Selector Widget
 * Allows browsing, testing, and selecting TTS voices
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Stack,
  Chip,
  CircularProgress,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import * as tts from './lib/tts';

// Memoized voice item component for performance
const VoiceItem = React.memo<{
  voice: SpeechSynthesisVoice;
  isSelected: boolean;
  isTesting: boolean;
  isAnyTesting: boolean;
  onTest: (voice: SpeechSynthesisVoice) => void;
  onSelect: (voice: SpeechSynthesisVoice) => void;
  showBorder: boolean;
}>(({ voice, isSelected, isTesting, isAnyTesting, onTest, onSelect, showBorder }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 2,
        borderBottom: showBorder ? `1px solid ${alpha(theme.palette.divider, 0.1)}` : 'none',
        background: isSelected ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
        '&:hover': {
          background: isSelected
            ? alpha(theme.palette.primary.main, 0.12)
            : alpha(theme.palette.action.hover, 0.04),
        },
        transition: 'background 0.2s',
      }}
    >
      {/* Voice Info */}
      <Box sx={{ flex: 1, minWidth: 0, mr: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography
            variant="body2"
            fontWeight={isSelected ? 600 : 400}
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {voice.name}
          </Typography>
          {isSelected && (
            <Chip label="Default" size="small" color="primary" sx={{ height: 20, fontSize: '0.7rem' }} />
          )}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
          <Chip
            label={voice.lang}
            size="small"
            variant="outlined"
            sx={{ height: 18, fontSize: '0.65rem' }}
          />
          <Chip
            label={voice.localService ? 'Local' : 'Remote'}
            size="small"
            variant="outlined"
            sx={{ height: 18, fontSize: '0.65rem' }}
          />
        </Stack>
      </Box>

      {/* Action Buttons */}
      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          variant="outlined"
          startIcon={isTesting ? <CircularProgress size={14} /> : <VolumeUpIcon fontSize="small" />}
          onClick={() => onTest(voice)}
          disabled={isTesting || isAnyTesting}
          sx={{ minWidth: 80 }}
        >
          {isTesting ? 'Testing' : 'Test'}
        </Button>

        <Button
          size="small"
          variant={isSelected ? 'contained' : 'outlined'}
          color="primary"
          startIcon={isSelected ? <CheckCircleIcon fontSize="small" /> : undefined}
          onClick={() => onSelect(voice)}
          disabled={isSelected}
          sx={{ minWidth: 90 }}
        >
          {isSelected ? 'Selected' : 'Select'}
        </Button>
      </Stack>
    </Box>
  );
});

VoiceItem.displayName = 'VoiceItem';

export function VoiceSelector() {
  const theme = useTheme();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('English');

  // Load voices on mount
  useEffect(() => {
    async function loadVoices() {
      await tts.waitForVoices();
      const availableVoices = tts.getVoices();
      setVoices(availableVoices);

      // Get saved voice from localStorage
      const savedVoiceURI = tts.getDefaultVoiceURI();
      if (savedVoiceURI) {
        setSelectedVoiceURI(savedVoiceURI);
      }

      setIsLoading(false);
    }

    loadVoices();
  }, []);

  // Filter voices based on search
  const filteredVoices = useMemo(() => {
    if (!searchFilter.trim()) return voices;
    const filter = searchFilter.toLowerCase();
    return voices.filter(
      (voice) =>
        voice.name.toLowerCase().includes(filter) ||
        voice.lang.toLowerCase().includes(filter)
    );
  }, [voices, searchFilter]);

  const handleTestVoice = useCallback(async (voice: SpeechSynthesisVoice) => {
    setIsTesting(voice.voiceURI);
    try {
      await tts.speak({
        text: 'Hello, this is a test of this voice.',
        voiceURI: voice.voiceURI,
        rate: 1.0,
      });
    } catch (err) {
      console.error('Error testing voice:', err);
    } finally {
      setIsTesting(null);
    }
  }, []);

  const handleSelectVoice = useCallback((voice: SpeechSynthesisVoice) => {
    setSelectedVoiceURI(voice.voiceURI);
    tts.setDefaultVoice(voice.voiceURI);
  }, []);

  if (isLoading) {
    return (
      <Box
        sx={{
          p: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">
          Loading voices...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        background: 'transparent',
      }}
    >
      <Stack spacing={2}>
        {/* Search Filter */}
        <TextField
          fullWidth
          size="small"
          label="Filter voices"
          placeholder="Search by name or language..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          sx={{
            mb: 1,
            '& .MuiOutlinedInput-root': {
              background: alpha(theme.palette.background.paper, 0.5),
            },
          }}
        />

        {/* Voice List */}
        {filteredVoices.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No voices found matching "{searchFilter}"
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              maxHeight: 400,
              overflowY: 'auto',
              border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
              borderRadius: 1,
              background: alpha(theme.palette.background.paper, 0.3),
            }}
          >
            <Stack spacing={0}>
              {filteredVoices.map((voice, index) => (
                <VoiceItem
                  key={voice.voiceURI}
                  voice={voice}
                  isSelected={voice.voiceURI === selectedVoiceURI}
                  isTesting={isTesting === voice.voiceURI}
                  isAnyTesting={isTesting !== null}
                  onTest={handleTestVoice}
                  onSelect={handleSelectVoice}
                  showBorder={index < filteredVoices.length - 1}
                />
              ))}
            </Stack>
          </Box>
        )}

        {/* Footer Info */}
        <Box
          sx={{
            pt: 1,
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Showing {filteredVoices.length} of {voices.length} voice
            {voices.length !== 1 ? 's' : ''}
            {selectedVoiceURI && (
              <>
                {' '}
                • Default:{' '}
                <strong>{voices.find((v) => v.voiceURI === selectedVoiceURI)?.name}</strong>
              </>
            )}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}
