'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CodeIcon from '@mui/icons-material/Code';
import { alpha, useTheme } from '@mui/material/styles';
import { Tivi } from '../components/tivi';
import { Eve } from '../components/eve';
import type { EvePoint, EveEmbedding } from '../components/eve';

interface ComponentDemo {
  name: string;
  category: string;
  description: string;
  component: React.ReactNode;
  code: string;
  props?: { name: string; type: string; description: string }[];
}

// Demo points for Eve
const EVE_DEMO_POINTS: EvePoint[] = [
  { id: '1', position: [-3, 2, 1], label: 'Cardiac arrhythmia', content: 'Irregular heartbeat patterns detected in ECG readings, including atrial fibrillation and ventricular tachycardia.', score: 0.95, group: 'cardiology' },
  { id: '2', position: [-2.5, 1.5, 0.5], label: 'Heart failure', content: 'Chronic condition where the heart muscle doesn\'t pump blood as well as it should.', score: 0.88, group: 'cardiology' },
  { id: '3', position: [-2, 2.5, -0.5], label: 'Myocardial infarction', content: 'Commonly known as heart attack, caused by blocked blood flow to the heart muscle.', score: 0.82, group: 'cardiology' },
  { id: '4', position: [2, -1, 3], label: 'Pneumonia treatment', content: 'Antibiotic therapy guidelines for community-acquired pneumonia in adult patients.', score: 0.71, group: 'pulmonology' },
  { id: '5', position: [2.5, -0.5, 2.5], label: 'COPD management', content: 'Long-term management strategies for chronic obstructive pulmonary disease.', score: 0.65, group: 'pulmonology' },
  { id: '6', position: [1.5, -1.5, 3.5], label: 'Asthma guidelines', content: 'Stepwise approach to asthma treatment including controller and rescue medications.', score: 0.58, group: 'pulmonology' },
  { id: '7', position: [0, 3, -2], label: 'Diabetes mellitus', content: 'Type 2 diabetes management with metformin as first-line therapy and lifestyle modifications.', score: 0.45, group: 'endocrinology' },
  { id: '8', position: [0.5, 3.5, -1.5], label: 'Thyroid disorders', content: 'Hypothyroidism and hyperthyroidism diagnosis and treatment protocols.', score: 0.42, group: 'endocrinology' },
  { id: '9', position: [-1, -2, -3], label: 'Neural networks', content: 'Deep learning architectures for medical image classification and diagnosis.', score: 0.35, group: 'ai-methods' },
  { id: '10', position: [-0.5, -2.5, -2.5], label: 'Transformer models', content: 'Attention-based models for clinical NLP and medical text understanding.', score: 0.32, group: 'ai-methods' },
  { id: '11', position: [-1.5, -1.5, -3.5], label: 'Embedding spaces', content: 'Vector representations of medical concepts in high-dimensional latent spaces.', score: 0.28, group: 'ai-methods' },
  { id: '12', position: [3, 1, 0], label: 'Renal function', content: 'Glomerular filtration rate estimation and chronic kidney disease staging.', score: 0.78, group: 'nephrology' },
  { id: '13', position: [3.5, 0.5, -0.5], label: 'Electrolyte balance', content: 'Sodium, potassium, and calcium homeostasis in renal patients.', score: 0.72, group: 'nephrology' },
  { id: '14', position: [-3.5, -1, 2], label: 'Drug interactions', content: 'Cytochrome P450 enzyme-mediated drug-drug interactions in polypharmacy patients.', score: 0.55, group: 'pharmacology' },
  { id: '15', position: [-4, 0, 1.5], label: 'Dosage optimization', content: 'Pharmacokinetic modeling for individualized dosing in special populations.', score: 0.48, group: 'pharmacology' },
  { id: '16', position: [1, 4, 1], label: 'Sepsis protocols', content: 'Early recognition and bundle-based treatment of sepsis and septic shock.', score: 0.91, group: 'critical-care' },
  { id: '17', position: [0, 0, 0], label: 'Clinical guidelines', content: 'Evidence-based clinical practice guidelines for primary care physicians.', score: 0.50, group: 'general' },
  { id: '18', position: [-2, 0, -1], label: 'Patient outcomes', content: 'Quality metrics and outcome measures for hospital performance evaluation.', score: 0.38, group: 'general' },
  { id: '19', position: [2, 2, -2], label: 'Surgical planning', content: 'Preoperative assessment and risk stratification for elective procedures.', score: 0.62, group: 'surgery' },
  { id: '20', position: [1, -3, 0], label: 'Immunotherapy', content: 'Checkpoint inhibitor therapy for advanced solid tumors and hematologic malignancies.', score: 0.85, group: 'oncology' },
  { id: '21', position: [1.5, -3.5, 0.5], label: 'Tumor markers', content: 'Biomarker-driven treatment selection in precision oncology approaches.', score: 0.80, group: 'oncology' },
  { id: '22', position: [-3, 3, 0], label: 'Hypertension', content: 'Blood pressure management targets and antihypertensive medication classes.', score: 0.75, group: 'cardiology' },
  { id: '23', position: [4, -2, 1], label: 'Ventilator settings', content: 'Lung-protective ventilation strategies for ARDS patients in the ICU.', score: 0.87, group: 'critical-care' },
  { id: '24', position: [-1, 1, 4], label: 'Pain management', content: 'Multimodal analgesia approaches including non-opioid and interventional techniques.', score: 0.53, group: 'general' },
  { id: '25', position: [0, -1, -4], label: 'RAG retrieval', content: 'Retrieval-augmented generation for medical question answering systems.', score: 0.25, group: 'ai-methods' },
];

const HAPPY_WORDS = ['joy', 'love', 'sunshine', 'laughter', 'delight', 'bliss', 'cheerful', 'wonderful', 'grateful', 'paradise'];
const SAD_WORDS = ['grief', 'sorrow', 'despair', 'heartbreak', 'misery', 'lonely', 'gloomy', 'painful', 'mourning', 'hopeless'];

async function fetchEmbedding(text: string, dimensions: number): Promise<number[]> {
  const res = await fetch('/api/openai_embedding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, dimensions }),
  });
  if (!res.ok) throw new Error(`Embedding API error: ${res.status}`);
  const data = await res.json();
  return data.embedding;
}

/** Eve demo wrapper that supports swapping between static points and live embeddings */
const EveDemoWrapper = ({ eveEmbeddings, numClusters }: { eveEmbeddings: EveEmbedding[] | null; numClusters?: number }) => {
  if (eveEmbeddings) {
    return (
      <Eve
        embeddings={eveEmbeddings}
        colorBy="cluster"
        numClusters={numClusters}
        onPointSelect={(point) => console.log('Eve point selected:', point)}
      />
    );
  }
  return (
    <Eve
      points={EVE_DEMO_POINTS}
      colorBy="score"
      onPointSelect={(point) => console.log('Eve point selected:', point)}
    />
  );
};

export const ComponentViewerClient = () => {
  const theme = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedDemo, setExpandedDemo] = useState<string | false>('voice-interface-basic');
  const [eveEmbeddings, setEveEmbeddings] = useState<EveEmbedding[] | null>(null);
  const [eveNumClusters, setEveNumClusters] = useState<number | undefined>(undefined);

  const setEveEmbeddingsRef = useRef(setEveEmbeddings);
  setEveEmbeddingsRef.current = setEveEmbeddings;
  const setEveNumClustersRef = useRef(setEveNumClusters);
  setEveNumClustersRef.current = setEveNumClusters;

  useEffect(() => {
    const bridge = {
      happySadTest: async (opts?: { clusters?: number }) => {
        console.log('[eve] Starting happy/sad embedding test...');
        console.log(`[eve] Fetching embeddings for ${HAPPY_WORDS.length + SAD_WORDS.length} words...`);

        const allWords = [
          ...HAPPY_WORDS.map((w) => ({ word: w, group: 'happy' as const })),
          ...SAD_WORDS.map((w) => ({ word: w, group: 'sad' as const })),
        ];

        const results = await Promise.all(
          allWords.map(async ({ word, group }, idx) => {
            const vector = await fetchEmbedding(word, 256);
            return {
              id: `${group}-${idx}`,
              vector,
              label: word,
              content: `"${word}" — ${group} word`,
              score: idx / (allWords.length - 1),
              group,
            } satisfies EveEmbedding;
          }),
        );

        console.log(`[eve] All ${results.length} embeddings fetched. Setting on Eve...`);
        setEveNumClustersRef.current(opts?.clusters);
        setEveEmbeddingsRef.current(results);
        console.log('[eve] Done! Eve will project via UMAP and render with cluster coloring.');
        console.log('[eve] Click points to see word labels and happy/sad group metadata.');
        return results;
      },

      loadEmbeddings: (embs: EveEmbedding[]) => {
        console.log(`[eve] Loading ${embs.length} custom embeddings...`);
        setEveEmbeddingsRef.current(embs);
      },

      reset: () => {
        console.log('[eve] Resetting to static demo points.');
        setEveEmbeddingsRef.current(null);
        setEveNumClustersRef.current(undefined);
      },
    };

    (window as any).__eve__ = bridge;
    console.log('[eve] Bridge mounted. Try: await window.__eve__.happySadTest()');

    return () => {
      delete (window as any).__eve__;
    };
  }, []);

  // Component demos registry
  const demos: ComponentDemo[] = [
    {
      name: 'Tidyscripts Voice Interface (Tivi)',
      category: 'voice',
      description: 'Voice-only interface with VAD-based TTS interruption, speech recognition, and text-to-speech',
      component: (
        <Tivi
          onTranscription={(text) => console.log('Transcription:', text)}
          onInterrupt={() => console.log('TTS Interrupted!')}
        />
      ),
      code: `<Tivi
  onTranscription={(text) => console.log(text)}
  onInterrupt={() => console.log('Interrupted!')}
/>`,
      props: [
        {
          name: 'onTranscription',
          type: '(text: string) => void',
          description: 'Callback when speech is transcribed',
        },
        {
          name: 'onInterrupt',
          type: '() => void',
          description: 'Callback when TTS is interrupted by user speech',
        },
        {
          name: 'onAudioLevel',
          type: '(level: number) => void',
          description: 'Callback for audio power level (0-1) for visualization',
        },
        {
          name: 'positiveSpeechThreshold',
          type: 'number',
          description: 'VAD speech detection threshold (0-1). Default: 0.3',
        },
        {
          name: 'negativeSpeechThreshold',
          type: 'number',
          description: 'VAD silence detection threshold (0-1). Default: 0.25',
        },
        {
          name: 'minSpeechStartMs',
          type: 'number',
          description: 'Minimum consecutive ms above threshold before triggering speech-start. Default: 150',
        },
        {
          name: 'language',
          type: 'string',
          description: 'Speech recognition language. Default: "en-US"',
        },
        {
          name: 'verbose',
          type: 'boolean',
          description: 'Enable verbose logging. Default: false',
        },
      ],
    },
    {
      name: 'Embedding Visualization Engine (Eve)',
      category: 'visualization',
      description: '3D/2D embedding projection viewer with cyberpunk aesthetic, bloom effects, and interactive point exploration',
      component: <EveDemoWrapper eveEmbeddings={eveEmbeddings} numClusters={eveNumClusters} />,
      code: `import { Eve } from '../components/eve';
import type { EvePoint } from '../components/eve';

// Mode 1: Pre-projected points
<Eve
  points={myPoints}
  colorBy="score"
  onPointSelect={(point) => console.log(point)}
/>

// Mode 2: Raw embeddings (auto-projects via UMAP/PCA)
<Eve
  embeddings={myEmbeddings}
  method="umap"
  dimensions={3}
  colorBy="group"
/>`,
      props: [
        {
          name: 'points',
          type: 'EvePoint[]',
          description: 'Pre-projected points with [x,y] or [x,y,z] positions',
        },
        {
          name: 'embeddings',
          type: 'EveEmbedding[]',
          description: 'Raw embedding vectors — Eve projects them internally via UMAP or PCA',
        },
        {
          name: 'query',
          type: 'number[]',
          description: 'Optional query vector rendered as a pulsing wireframe marker at origin',
        },
        {
          name: 'method',
          type: "'umap' | 'pca'",
          description: 'Projection method for embeddings mode. Default: "umap"',
        },
        {
          name: 'dimensions',
          type: '2 | 3',
          description: 'Target projection dimensions. Default: 3',
        },
        {
          name: 'colorBy',
          type: "'score' | 'group'",
          description: 'Color points by relevance score gradient or group membership',
        },
        {
          name: 'onPointSelect',
          type: '(point: EvePoint) => void',
          description: 'Callback fired when a point is clicked',
        },
        {
          name: 'showDetailPanel',
          type: 'boolean',
          description: 'Override setting to show/hide the detail slide-in panel',
        },
        {
          name: 'showSettings',
          type: 'boolean',
          description: 'Show the settings gear icon. Default: true',
        },
      ],
    },
  ];

  const categories = ['all', ...Array.from(new Set(demos.map((d) => d.category)))];

  const filteredDemos = selectedCategory === 'all'
    ? demos
    : demos.filter((d) => d.category === selectedCategory);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
          Component Viewer
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Browse, test, and explore Tidyscripts components in isolation
        </Typography>
      </Box>

      {/* Category Tabs */}
      <Paper elevation={0} sx={{ mb: 3, background: 'transparent' }}>
        <Tabs
          value={selectedCategory}
          onChange={(_, value) => setSelectedCategory(value)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          {categories.map((category) => (
            <Tab
              key={category}
              label={category.toUpperCase()}
              value={category}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Component Demos */}
      <Box display="flex" flexDirection="column" gap={2}>
        {filteredDemos.map((demo, index) => (
          <Accordion
            key={index}
            expanded={expandedDemo === `${demo.category}-${index}`}
            onChange={(_, isExpanded) =>
              setExpandedDemo(isExpanded ? `${demo.category}-${index}` : false)
            }
            sx={{
              background: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(10px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              '&:before': {
                display: 'none',
              },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                '&:hover': {
                  background: alpha(theme.palette.primary.main, 0.05),
                },
              }}
            >
              <Box display="flex" alignItems="center" gap={2} width="100%">
                <Chip
                  label={demo.category}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Box>
                  <Typography variant="h6">{demo.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {demo.description}
                  </Typography>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box display="flex" flexDirection="column" gap={3}>
                {/* Live Demo */}
                <Box>
                  <Typography
                    variant="subtitle2"
                    color="primary"
                    gutterBottom
                    sx={{ mb: 2 }}
                  >
                    Live Demo
                  </Typography>
                  <Box
                    sx={{
                      p: 3,
                      background: alpha(theme.palette.background.default, 0.5),
                      borderRadius: 2,
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    }}
                  >
                    {demo.component}
                  </Box>
                </Box>

                <Divider />

                {/* Code Example */}
                <Box>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <CodeIcon fontSize="small" color="primary" />
                    <Typography variant="subtitle2" color="primary">
                      Code Example
                    </Typography>
                  </Box>
                  <Paper
                    sx={{
                      p: 2,
                      background: alpha(theme.palette.grey[900], 0.9),
                      color: theme.palette.grey[100],
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      overflow: 'auto',
                      maxHeight: 300,
                    }}
                  >
                    <pre>{demo.code}</pre>
                  </Paper>
                </Box>

                {/* Props Documentation */}
                {demo.props && (
                  <>
                    <Divider />
                    <Box>
                      <Typography
                        variant="subtitle2"
                        color="primary"
                        gutterBottom
                        sx={{ mb: 2 }}
                      >
                        Props
                      </Typography>
                      <Box display="flex" flexDirection="column" gap={1}>
                        {demo.props.map((prop, i) => (
                          <Paper
                            key={i}
                            variant="outlined"
                            sx={{
                              p: 2,
                              background: alpha(theme.palette.background.default, 0.3),
                            }}
                          >
                            <Box display="flex" alignItems="baseline" gap={1} mb={0.5}>
                              <Typography
                                variant="body2"
                                sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                              >
                                {prop.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  fontFamily: 'monospace',
                                  color: theme.palette.info.main,
                                }}
                              >
                                {prop.type}
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {prop.description}
                            </Typography>
                          </Paper>
                        ))}
                      </Box>
                    </Box>
                  </>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {/* Footer */}
      <Box mt={6} textAlign="center">
        <Typography variant="caption" color="text.secondary">
          Component Viewer • Tidyscripts Laboratory
        </Typography>
      </Box>
    </Container>
  );
};
