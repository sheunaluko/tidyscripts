// Note Generator Component

import React, { useEffect, useRef } from 'react';
import { Box, Typography, Button, Alert, Paper, Chip, Skeleton, Grid, CircularProgress } from '@mui/material';
import { AutoAwesome, Refresh, Warning } from '@mui/icons-material';
import { NoteDisplay } from './NoteDisplay';
import { VoiceBox } from './VoiceBox';
import { DotPhraseIndex } from './DotPhraseIndex';
import { useNoteGeneration } from '../../hooks/useNoteGeneration';
import { useRaiStore } from '../../store/useRaiStore';
import { useSelectedTemplate } from '../../hooks/useTemplateLookups';
import { useInsights } from '../../context/InsightsContext';

export const NoteGenerator: React.FC = () => {
    const { client: insightsClient } = useInsights();
    const { generate, generateAnyway, dismissReview, generatedNote, loading, reviewing, reviewMessage, error } = useNoteGeneration(insightsClient);
    const selectedTemplate = useSelectedTemplate();
    const { settings, collectedInformation } = useRaiStore();

    // Always show blank note editor by default
    const noteToDisplay = generatedNote || '';

    // Ref guard prevents double-fire from React Strict Mode's double-effect invocation
    const autostartFired = useRef(false);
    useEffect(() => {
	if (settings.autostartGeneration && !generatedNote && !loading && collectedInformation.length > 0 && !autostartFired.current) {
	    autostartFired.current = true;
	    generate();
	}
    }, [settings.autostartGeneration, generatedNote, loading, collectedInformation.length, generate]);

    return (
	<Box sx={{display: 'flex' ,
		  justifyContent : 'space-between' , 
		  flexDirection : 'column'}}>
	    {/* Header */}
	    <Box sx={{ mb: 3 }}>
		<Typography variant="h4" gutterBottom>
		    Note Generator
		</Typography>

		<Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
		    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
			<Typography variant="h6">{selectedTemplate ? selectedTemplate.title  : "None"}</Typography>
			<Chip
			    label={settings.aiModel}
			    size="small"
			    sx={{ bgcolor: 'background.paper' }}
			/>
		    </Box>
		    <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
			Using {collectedInformation.length} information entries
		    </Typography>
		</Paper>
	    </Box>

	    {/* Error Display */}
	    {error && (
		<Alert severity="error" sx={{ mb: 2 }} onClose={() => generate()}>
		    {error}
		</Alert>
	    )}

	    {/* Review Indicator */}
	    {reviewing && (
		<Alert severity="info" icon={<CircularProgress size={20} />} sx={{ mb: 2 }}>
		    Reviewing template requirements...
		</Alert>
	    )}

	    {/* Review Message */}
	    {reviewMessage && (
		<Alert
		    severity="warning"
		    icon={<Warning />}
		    sx={{ mb: 2 }}
		    onClose={dismissReview}
		    action={
			<Button color="warning" size="small" onClick={generateAnyway}>
			    Generate Anyway
			</Button>
		    }
		>
		    {reviewMessage}
		</Alert>
	    )}

	    {/* Generate Button and Voice Box */}
	    <Box>
		<Button
		    variant="contained"
		    size="large"
		    startIcon={<AutoAwesome />}
		    onClick={generate}
		    disabled={reviewing}
		    fullWidth
		    sx={{ mb: 2 }}
		>
		    {reviewing ? 'Reviewing...' : 'Generate Note'}
		</Button>

	    </Box>



	    {/* Loading State */}
	    {loading && (
		<Paper sx={{ p: 3 }}>
		    <Box sx={{ mb: 2 }}>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
			    Generating note with {settings.aiModel}...
			</Typography>
		    </Box>
		    <Skeleton variant="text" width="40%" height={40} sx={{ mb: 2 }} />
		    <Skeleton variant="text" width="100%" height={24} />
		    <Skeleton variant="text" width="100%" height={24} />
		    <Skeleton variant="text" width="90%" height={24} sx={{ mb: 2 }} />
		    <Skeleton variant="text" width="30%" height={32} sx={{ mb: 1 }} />
		    <Skeleton variant="text" width="100%" height={24} />
		    <Skeleton variant="text" width="100%" height={24} />
		    <Skeleton variant="text" width="95%" height={24} sx={{ mb: 2 }} />
		    <Skeleton variant="text" width="30%" height={32} sx={{ mb: 1 }} />
		    <Skeleton variant="text" width="100%" height={24} />
		    <Skeleton variant="text" width="85%" height={24} />
		</Paper>
	    )}

	    {/* Note Display - always show when not loading */}
	    {!loading && (
		<Box>
		    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
			<Typography variant="h6">
			    {generatedNote ? 'Generated Note' : 'Note Editor'}
			</Typography>
			{generatedNote && (
			    <Button
				variant="outlined"
				startIcon={<Refresh />}
				onClick={generate}
				size="small"
			    >
				Regenerate
			    </Button>
			)}
		    </Box>

		    <NoteDisplay note={noteToDisplay} />
		</Box>
	    )}


		{/* Two-Column Layout: VoiceBox + Dot Phrase Index */}
		<Box sx={{ mt: 3, mb: 3, maxHeight: '300px', height: '300px' }}>
		    <Grid container spacing={2} sx={{ height: '100%' }}>
			<Grid item xs={12} md={8} sx={{ height: '100%' }}>
			    <VoiceBox />
			</Grid>
			<Grid item xs={12} md={4} sx={{ height: '100%' }}>
			    <DotPhraseIndex />
			</Grid>
		    </Grid>
		</Box> 


	</Box>
    );
};
