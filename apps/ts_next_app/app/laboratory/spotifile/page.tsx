'use client';

import { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { Box, Typography, Button, CircularProgress } from "../../../src/mui";
import styles from '../../../styles/Default.module.css';

// You'll need to set these up in your environment variables
const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI;

interface SpotifyTrack {
    name: string;
    artists: { name: string }[];
    album: { name: string };
}

const SpotifilePage: NextPage = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [likedSongs, setLikedSongs] = useState<SpotifyTrack[]>([]);
    const [accessToken, setAccessToken] = useState<string | null>(null);

    useEffect(() => {
        // Check if we're returning from Spotify auth
        const hash = window.location.hash;
        if (hash) {
            const token = hash
                .substring(1)
                .split('&')
                .find(elem => elem.startsWith('access_token'))
                ?.split('=')[1];
            
            if (token) {
                setAccessToken(token);
                window.location.hash = '';
            }
        }
    }, []);

    const handleLogin = () => {
        const scope = 'user-library-read';
        window.location.href = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${scope}&response_type=token`;
    };

    const fetchLikedSongs = async () => {
        if (!accessToken) return;
        
        setIsLoading(true);
        try {
            let allTracks: SpotifyTrack[] = [];
            let url = 'https://api.spotify.com/v1/me/tracks?limit=50';
            
            while (url) {
                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
                const data = await response.json();
                allTracks = [...allTracks, ...data.items.map((item: any) => item.track)];
                
                // Get next page URL if it exists
                url = data.next;
            }
            
            setLikedSongs(allTracks);
        } catch (error) {
            console.error('Error fetching liked songs:', error);
        }
        setIsLoading(false);
    };

    const handleExportCSV = () => {
        const csvContent = likedSongs
            .map(track => `${track.name},${track.artists.map(a => a.name).join('; ')}`)
            .join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', 'spotify-liked-songs.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        if (accessToken) {
            fetchLikedSongs();
        }
    }, [accessToken]);

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <h1 className={styles.title}>Spotifile</h1>
                {accessToken && !isLoading && likedSongs.length > 0 && (
                    <Button 
                        variant="outlined" 
                        onClick={handleExportCSV}
                    >
                        Export to CSV
                    </Button>
                )}
            </Box>
            
            <p className={styles.description}>
                View your Spotify liked songs
            </p>

            <Box sx={{ mt: 4 }}>
                {!accessToken ? (
                    <Button 
                        variant="contained" 
                        onClick={handleLogin}
                        sx={{ mb: 3 }}
                    >
                        Login with Spotify
                    </Button>
                ) : (
                    <Box>
                        {isLoading ? (
                            <CircularProgress />
                        ) : (
                            <Box>
                                <Typography variant="h6" sx={{ mb: 2 }}>
                                    Your Liked Songs ({likedSongs.length})
                                </Typography>
                                <Box sx={{ 
                                    maxHeight: '60vh', 
                                    overflowY: 'auto',
                                    pr: 2,
                                    '&::-webkit-scrollbar': {
                                        width: '8px',
                                    },
                                    '&::-webkit-scrollbar-track': {
                                        backgroundColor: 'rgba(0,0,0,0.1)',
                                        borderRadius: '4px',
                                    },
                                    '&::-webkit-scrollbar-thumb': {
                                        backgroundColor: 'rgba(0,0,0,0.2)',
                                        borderRadius: '4px',
                                        '&:hover': {
                                            backgroundColor: 'rgba(0,0,0,0.3)',
                                        },
                                    },
                                }}>
                                    {likedSongs.map((track, index) => (
                                        <Box 
                                            key={index} 
                                            sx={{ 
                                                mb: 1, 
                                                p: 1, 
                                                borderRadius: 1,
                                                '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
                                            }}
                                        >
                                            <Typography variant="body1">
                                                {track.name}
                                            </Typography>
                                            <Typography variant="body2" color="textSecondary">
                                                {track.artists.map(a => a.name).join(', ')} • {track.album.name}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                        )}
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default SpotifilePage; 