'use client';

import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip,
    Grid,
    LinearProgress,
    Container,
    Paper,
    Fade,
    Slide,
    Zoom,
    TextField,
    InputAdornment,
    ThemeProvider,
    createTheme,
    CircularProgress,
    IconButton
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Science as ScienceIcon,
    Info as InfoIcon,
    Search as SearchIcon,
    Close as CloseIcon,
    BookmarkBorder as BookmarkIcon
} from '@mui/icons-material';
import abimData from './abim_blueprint_data.json';
import { handle_topic_request } from './util';

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#64b5f6',
            light: '#90caf9',
            dark: '#42a5f5',
        },
        secondary: {
            main: '#81c784',
            light: '#a5d6a7',
            dark: '#66bb6a',
        },
        background: {
            default: '#121212',
            paper: '#1e1e1e',
        },
        text: {
            primary: '#ffffff',
            secondary: '#b0b0b0',
        },
    },
});

interface Topic {
    topic: string;
}

interface Subcategory {
    percentage: string;
    topics: string[];
}

interface Specialty {
    percentage: string;
    subcategories: Record<string, Subcategory>;
}

interface ABIMData {
    [key: string]: Specialty;
}

interface MedicalCondition {
    name: string;
    presentation: string;
    diagnosis: string;
    first_line: string;
    second_line: string;
}

interface TopicResponse {
    topic: string;
    specialty: string;
    subcategory: string;
    conditions: MedicalCondition[];
}

const AnimatedCard = ({ children, delay = 0, ...props }: any) => {
    const [show, setShow] = useState(false);
    
    useEffect(() => {
        const timer = setTimeout(() => setShow(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);
    
    return (
        <Slide direction="up" in={show} timeout={600}>
            <Card {...props}>
                {children}
            </Card>
        </Slide>
    );
};

const PercentageBar = ({ percentage, color = "#64b5f6" }: { percentage: string; color?: string }) => {
    const numericValue = parseFloat(percentage.replace(/[<>%]/g, ''));
    const isLessThan = percentage.startsWith('<');
    
    return (
        <Box sx={{ width: '100%', mr: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="primary.light" sx={{ minWidth: 35 }}>
                    {percentage}
                </Typography>
                <Box sx={{ width: '100%', ml: 1 }}>
                    <LinearProgress 
                        variant="determinate" 
                        value={isLessThan ? numericValue * 0.8 : numericValue} 
                        sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: 'rgba(100, 181, 246, 0.2)',
                            '& .MuiLinearProgress-bar': {
                                backgroundColor: color,
                                borderRadius: 4,
                            }
                        }}
                    />
                </Box>
            </Box>
        </Box>
    );
};

const TopicChip = ({ 
    topic, 
    index, 
    specialty, 
    subcategory, 
    onTopicClick 
}: { 
    topic: string; 
    index: number; 
    specialty: string; 
    subcategory: string; 
    onTopicClick: (topic: string, specialty: string, subcategory: string) => void;
}) => {
    const [show, setShow] = useState(false);
    
    useEffect(() => {
        const timer = setTimeout(() => setShow(true), index * 100);
        return () => clearTimeout(timer);
    }, [index]);
    
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onTopicClick(topic, specialty, subcategory);
    };
    
    return (
        <Zoom in={show} timeout={400}>
            <Chip 
                label={topic} 
                variant="outlined" 
                size="small"
                clickable
                onClick={handleClick}
                sx={{ 
                    m: 0.5,
                    borderColor: 'primary.main',
                    color: 'primary.light',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        backgroundColor: 'primary.main',
                        color: 'black',
                        transform: 'scale(1.05)',
                        borderColor: 'primary.light'
                    }
                }}
            />
        </Zoom>
    );
};

const MedicalConditionCard = ({ condition, index }: { condition: MedicalCondition; index: number }) => {
    return (
        <Fade in={true} timeout={600} style={{ transitionDelay: `${index * 200}ms` }}>
            <Paper 
                elevation={2}
                sx={{ 
                    p: 3, 
                    mb: 2,
                    backgroundColor: 'rgba(100, 181, 246, 0.05)',
                    border: '1px solid rgba(100, 181, 246, 0.2)',
                    borderRadius: 2
                }}
            >
                <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold', mb: 2 }}>
                    {condition.name}
                </Typography>
                
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" sx={{ color: 'primary.light', fontWeight: 'bold', mb: 1 }}>
                                📋 Presentation:
                            </Typography>
                            <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                                {condition.presentation}
                            </Typography>
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" sx={{ color: 'primary.light', fontWeight: 'bold', mb: 1 }}>
                                🔬 Diagnosis:
                            </Typography>
                            <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                                {condition.diagnosis}
                            </Typography>
                        </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" sx={{ color: 'primary.light', fontWeight: 'bold', mb: 1 }}>
                                💊 First-line Treatment:
                            </Typography>
                            <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                                {condition.first_line}
                            </Typography>
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" sx={{ color: 'primary.light', fontWeight: 'bold', mb: 1 }}>
                                🔄 Second-line Treatment:
                            </Typography>
                            <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                                {condition.second_line}
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>
        </Fade>
    );
};

const TopicInfoDisplay = ({ 
    topicResponse, 
    isLoading, 
    onClose 
}: { 
    topicResponse: TopicResponse | null; 
    isLoading: boolean; 
    onClose: () => void; 
}) => {
    if (!topicResponse && !isLoading) return null;
    
    return (
        <Fade in={true} timeout={500}>
            <Paper 
                elevation={4} 
                sx={{ 
                    p: 3, 
                    mb: 3,
                    backgroundColor: 'background.paper',
                    border: '2px solid',
                    borderColor: 'primary.main',
                    position: 'relative'
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                    <Box sx={{ flexGrow: 1 }}>
                        {isLoading ? (
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <CircularProgress size={24} sx={{ mr: 2, color: 'primary.main' }} />
                                <Typography variant="h5" color="primary.main">
                                    Loading high-yield medical information...
                                </Typography>
                            </Box>
                        ) : topicResponse && (
                            <>
                                <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 'bold', mb: 1 }}>
                                    <BookmarkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                    {topicResponse.topic}
                                </Typography>
                                <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 1 }}>
                                    {topicResponse.specialty} → {topicResponse.subcategory}
                                </Typography>
                                <Chip 
                                    label={`${topicResponse.conditions.length} condition${topicResponse.conditions.length > 1 ? 's' : ''}`}
                                    size="small"
                                    sx={{ 
                                        backgroundColor: 'primary.main', 
                                        color: 'black',
                                        fontWeight: 'bold'
                                    }}
                                />
                            </>
                        )}
                    </Box>
                    <IconButton 
                        onClick={onClose}
                        sx={{ 
                            color: 'primary.main',
                            '&:hover': { backgroundColor: 'rgba(100, 181, 246, 0.1)' }
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </Box>
                
                {!isLoading && topicResponse && (
                    <Box>
                        <Typography variant="h6" sx={{ color: 'primary.main', mb: 3, textAlign: 'center' }}>
                            🎯 High-Yield Study Information
                        </Typography>
                        
                        {topicResponse.conditions.map((condition, index) => (
                            <MedicalConditionCard 
                                key={condition.name}
                                condition={condition}
                                index={index}
                            />
                        ))}
                    </Box>
                )}
            </Paper>
        </Fade>
    );
};

const SubcategoryAccordion = ({ 
    name, 
    subcategory, 
    index, 
    specialty, 
    onTopicClick 
}: any) => {
    const [expanded, setExpanded] = useState(false);
    
    const handleChange = (event: React.SyntheticEvent, isExpanded: boolean) => {
        event.stopPropagation();
        setExpanded(isExpanded);
    };
    
    return (
        <Fade in={true} timeout={800} style={{ transitionDelay: `${index * 100}ms` }}>
            <Accordion 
                expanded={expanded}
                onChange={handleChange}
                sx={{ 
                    mb: 1,
                    width: '100%',
                    backgroundColor: 'background.paper',
                    boxShadow: '0 2px 8px rgba(100, 181, 246, 0.1)',
                    '&:hover': {
                        boxShadow: '0 4px 16px rgba(100, 181, 246, 0.2)',
                    },
                    transition: 'all 0.3s ease'
                }}
            >
                <AccordionSummary 
                    expandIcon={<ExpandMoreIcon sx={{ color: 'primary.main' }} />}
                    sx={{
                        backgroundColor: expanded ? 'rgba(100, 181, 246, 0.1)' : 'transparent',
                        transition: 'all 0.3s ease',
                        width: '100%'
                    }}
                >
                    <Box sx={{ width: '100%' }}>
                        <Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>
                            {name}
                        </Typography>
                        <PercentageBar percentage={subcategory.percentage} color="#64b5f6" />
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ backgroundColor: 'rgba(100, 181, 246, 0.05)', width: '100%' }}>
                    {subcategory.topics.length > 0 ? (
                        <Box sx={{ width: '100%' }}>
                            <Typography variant="subtitle2" color="primary.light" sx={{ mb: 2 }}>
                                Topics ({subcategory.topics.length}):
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', width: '100%' }}>
                                {subcategory.topics.map((topic: string, topicIndex: number) => (
                                    <TopicChip 
                                        key={topicIndex} 
                                        topic={topic} 
                                        index={topicIndex}
                                        specialty={specialty}
                                        subcategory={name}
                                        onTopicClick={onTopicClick}
                                    />
                                ))}
                            </Box>
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary" fontStyle="italic">
                            No specific topics listed
                        </Typography>
                    )}
                </AccordionDetails>
            </Accordion>
        </Fade>
    );
};

const SpecialtyCard = ({ name, specialty, index, onTopicClick }: any) => {
    const [expanded, setExpanded] = useState(false);
    
    const handleHeaderClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setExpanded(!expanded);
    };
    
    return (
        <AnimatedCard 
            delay={index * 150}
            sx={{ 
                mb: 3,
                width: '100%',
                backgroundColor: 'background.paper',
                transition: 'all 0.3s ease',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 25px rgba(100, 181, 246, 0.15)'
                }
            }}
        >
            <CardContent sx={{ width: '100%' }}>
                <Box 
                    sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 2,
                        cursor: 'pointer',
                        width: '100%'
                    }}
                    onClick={handleHeaderClick}
                >
                    <ScienceIcon sx={{ color: 'primary.main', mr: 2, fontSize: 28 }} />
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                            {name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {Object.keys(specialty.subcategories).length} subcategories
                        </Typography>
                    </Box>
                    <Chip 
                        label={specialty.percentage} 
                        sx={{ 
                            backgroundColor: 'primary.main',
                            color: 'black',
                            fontWeight: 'bold',
                            fontSize: '0.9rem'
                        }}
                    />
                </Box>
                
                <Box onClick={handleHeaderClick} sx={{ cursor: 'pointer', width: '100%' }}>
                    <PercentageBar percentage={specialty.percentage} color="#64b5f6" />
                </Box>
                
                {expanded && (
                    <Fade in={expanded} timeout={500}>
                        <Box sx={{ mt: 3, width: '100%' }}>
                            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', color: 'primary.main' }}>
                                <InfoIcon sx={{ mr: 1, color: 'primary.main' }} />
                                Subcategories
                            </Typography>
                            {Object.entries(specialty.subcategories).map(([subName, subcategory], subIndex) => (
                                <SubcategoryAccordion 
                                    key={subName}
                                    name={subName}
                                    subcategory={subcategory}
                                    index={subIndex}
                                    specialty={name}
                                    onTopicClick={onTopicClick}
                                />
                            ))}
                        </Box>
                    </Fade>
                )}
            </CardContent>
        </AnimatedCard>
    );
};

const SearchBar = ({ searchTerm, onSearchChange }: { searchTerm: string; onSearchChange: (term: string) => void }) => {
    return (
        <Paper 
            elevation={2} 
            sx={{ 
                p: 2, 
                mb: 3,
                backgroundColor: 'background.paper'
            }}
        >
            <TextField
                fullWidth
                variant="outlined"
                placeholder="Search for topics, specialties, or subcategories..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon sx={{ color: 'primary.main' }} />
                        </InputAdornment>
                    ),
                }}
                sx={{
                    '& .MuiOutlinedInput-root': {
                        color: 'text.primary',
                        '& fieldset': {
                            borderColor: 'primary.main',
                        },
                        '&:hover fieldset': {
                            borderColor: 'primary.light',
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: 'primary.main',
                        },
                    },
                }}
            />
        </Paper>
    );
};

const StatsSummary = ({ filteredCount, totalCount }: { filteredCount?: number; totalCount: number }) => {
    const [show, setShow] = useState(false);
    
    useEffect(() => {
        const timer = setTimeout(() => setShow(true), 500);
        return () => clearTimeout(timer);
    }, []);
    
    const specialties = Object.keys(abimData).length;
    const totalSubcategories = Object.values(abimData).reduce((sum, specialty) => 
        sum + Object.keys(specialty.subcategories).length, 0
    );
    const totalTopics = Object.values(abimData).reduce((sum, specialty) => 
        sum + Object.values(specialty.subcategories).reduce((subSum, sub) => 
            subSum + sub.topics.length, 0
        ), 0
    );
    
    return (
        <Fade in={show} timeout={1000}>
            <Paper 
                elevation={3} 
                sx={{ 
                    p: 3, 
                    mb: 4, 
                    background: 'linear-gradient(135deg, #42a5f5 0%, #1976d2 100%)',
                    color: 'white'
                }}
            >
                <Typography variant="h4" sx={{ mb: 3, textAlign: 'center', fontWeight: 'bold' }}>
                    ABIM Internal Medicine Exam Blueprint
                </Typography>
                {filteredCount !== undefined && filteredCount < totalCount && (
                    <Typography variant="h6" sx={{ mb: 2, textAlign: 'center', opacity: 0.9 }}>
                        Showing {filteredCount} of {totalCount} results
                    </Typography>
                )}
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                {specialties}
                            </Typography>
                            <Typography variant="h6">Medical Specialties</Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                {totalSubcategories}
                            </Typography>
                            <Typography variant="h6">Subcategories</Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                {totalTopics}
                            </Typography>
                            <Typography variant="h6">Specific Topics</Typography>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>
        </Fade>
    );
};

const ABIMBlueprintPage = () => {
    const data = abimData as ABIMData;
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTopicResponse, setSelectedTopicResponse] = useState<TopicResponse | null>(null);
    const [isLoadingTopic, setIsLoadingTopic] = useState(false);
    
    const handleTopicClick = async (topic: string, specialty: string, subcategory: string) => {
        setIsLoadingTopic(true);
        setSelectedTopicResponse(null);
        
        try {
            console.log('Fetching information for topic:', topic);
            const response = await handle_topic_request(topic);
            console.log('Received response:', response);
            
            const topicResponse: TopicResponse = {
                topic,
                specialty,
                subcategory,
                conditions: response.conditions
            };
            setSelectedTopicResponse(topicResponse);
        } catch (error) {
            console.error('Error fetching topic information:', error);
            // You could add user-facing error handling here
        } finally {
            setIsLoadingTopic(false);
        }
    };
    
    const handleCloseTopicInfo = () => {
        setSelectedTopicResponse(null);
        setIsLoadingTopic(false);
    };
    
    // Filter data based on search term
    const filteredData = React.useMemo(() => {
        if (!searchTerm.trim()) return data;
        
        const searchLower = searchTerm.toLowerCase();
        const filtered: ABIMData = {};
        
        Object.entries(data).forEach(([specialtyName, specialty]) => {
            // Check if specialty name matches
            const specialtyMatches = specialtyName.toLowerCase().includes(searchLower);
            
            // Check subcategories and topics
            const matchingSubcategories: Record<string, Subcategory> = {};
            
            Object.entries(specialty.subcategories).forEach(([subName, subcategory]) => {
                const subMatches = subName.toLowerCase().includes(searchLower);
                const topicMatches = subcategory.topics.some(topic => 
                    topic.toLowerCase().includes(searchLower)
                );
                
                if (specialtyMatches || subMatches || topicMatches) {
                    matchingSubcategories[subName] = subcategory;
                }
            });
            
            if (specialtyMatches || Object.keys(matchingSubcategories).length > 0) {
                filtered[specialtyName] = {
                    ...specialty,
                    subcategories: matchingSubcategories
                };
            }
        });
        
        return filtered;
    }, [data, searchTerm]);
    
    const totalItems = Object.keys(data).length;
    const filteredItems = Object.keys(filteredData).length;
    
    return (
        <ThemeProvider theme={darkTheme}>
            <Box sx={{ 
                minHeight: '100vh',
		width : "100%",
		padding : "10px" , 
                backgroundColor: 'background.default',
                color: 'text.primary'
            }}>
                <Container maxWidth="lg" sx={{ py: 4 }}>
                    <StatsSummary 
                        filteredCount={searchTerm ? filteredItems : undefined}
                        totalCount={totalItems}
                    />
                    
                    <SearchBar 
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                    />
                    
                    <TopicInfoDisplay 
                        topicResponse={selectedTopicResponse}
                        isLoading={isLoadingTopic}
                        onClose={handleCloseTopicInfo}
                    />
                    
                    {Object.keys(filteredData).length === 0 && searchTerm ? (
                        <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: 'background.paper' }}>
                            <Typography variant="h6" color="text.secondary">
                                No results found for: {searchTerm} 
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Try searching for different keywords or check your spelling
                            </Typography>
                        </Paper>
                    ) : (
                        Object.entries(filteredData)
                            .sort(([, a], [, b]) => parseFloat(b.percentage) - parseFloat(a.percentage))
                            .map(([specialtyName, specialty], index) => (
                                <SpecialtyCard 
                                    key={specialtyName}
                                    name={specialtyName}
                                    specialty={specialty}
                                    index={index}
                                    onTopicClick={handleTopicClick}
                                />
                            ))
                    )}
                </Container>
            </Box>
        </ThemeProvider>
    );
};

export default ABIMBlueprintPage;