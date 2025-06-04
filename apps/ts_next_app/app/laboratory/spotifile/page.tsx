 'use client';

import { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ExpandMoreIcon,
} from "../../../src/mui";
import styles from '../../../styles/Default.module.css';

// Spotify OAuth settings (set in your .env)
const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI;

interface Playlist {
  id: string;
  name: string;
  trackCount: number;
}
interface SpotifyTrack {
  name: string;
  artists: { name: string }[];
  album: { name: string };
}

const SpotifileV2Page: NextPage = () => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [tracksByPlaylist, setTracksByPlaylist] = useState<Record<string, SpotifyTrack[]>>({});
  const [loadingTracks, setLoadingTracks] = useState<Record<string, boolean>>({});

  // Parse access token from URL hash
  useEffect(() => {
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

  // Fetch playlists once token is set
  useEffect(() => {
    if (accessToken) fetchPlaylists();
  }, [accessToken]);

  const handleLogin = () => {
    if (!CLIENT_ID) {
      console.error('Spotify CLIENT_ID is not set. Please configure NEXT_PUBLIC_SPOTIFY_CLIENT_ID.');
      return;
    }
    const scope = 'playlist-read-private playlist-read-collaborative';
    // Use configured redirect URI or fallback to current page URL (without hash)
    const redirectUri = REDIRECT_URI || window.location.href.split('#')[0];
    if (!redirectUri) {
      console.error('Redirect URI is not available. Please configure NEXT_PUBLIC_REDIRECT_URI.');
      return;
    }
    const authUrl =
      `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&response_type=token`;
    window.location.href = authUrl;
  };

  const fetchPlaylists = async () => {
    if (!accessToken) return;
    setLoadingPlaylists(true);
    try {
      let all: Playlist[] = [];
      let url: string | null = 'https://api.spotify.com/v1/me/playlists?limit=50';
      while (url) {
        const res : any  = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        const items = (data.items || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          trackCount: item.tracks?.total || 0,
        }));
        all = all.concat(items);
        url = data.next;
      }
      setPlaylists(all);
    } catch (err) {
      console.error('Error fetching playlists:', err);
    }
    setLoadingPlaylists(false);
  };

  const fetchPlaylistTracks = async (playlistId: string) => {
    if (!accessToken) return;
    if (tracksByPlaylist[playlistId]) return;
    setLoadingTracks(prev => ({ ...prev, [playlistId]: true }));
    try {
      let allTracks: SpotifyTrack[] = [];
      let url: string | null =
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;
      while (url) {
        const res : any = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        const items = (data.items || [])
          .map((item: any) => item.track)
          .filter((t: any) => t != null)
          .map((track: any) => ({
            name: track.name,
            artists: track.artists,
            album: track.album,
          }));
        allTracks = allTracks.concat(items);
        url = data.next;
      }
      setTracksByPlaylist(prev => ({ ...prev, [playlistId]: allTracks }));
    } catch (err) {
      console.error(`Error fetching tracks for ${playlistId}:`, err);
    }
    setLoadingTracks(prev => ({ ...prev, [playlistId]: false }));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <h1 className={styles.title}>Spotifile V2</h1>
      </Box>
      <p className={styles.description}>View your Spotify playlists and their tracks</p>
      <Box sx={{ mt: 4 }}>
        {!accessToken ? (
          <Button variant="contained" onClick={handleLogin}>
            Login with Spotify
          </Button>
        ) : loadingPlaylists ? (
          <CircularProgress />
        ) : (
          playlists.map(pl => (
            <Accordion key={pl.id} onChange={(_, expanded) => expanded && fetchPlaylistTracks(pl.id)}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>
                  {pl.name} ({pl.trackCount})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {loadingTracks[pl.id] ? (
                  <CircularProgress />
                ) : tracksByPlaylist[pl.id] ? (
                  <Box>
                    {tracksByPlaylist[pl.id].map((track, idx) => (
                      <Box key={idx} sx={{ mb: 1 }}>
                        <Typography variant="body1">{track.name}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          {track.artists.map(a => a.name).join(', ')} • {track.album.name}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ) : null}
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </Box>
    </Box>
  );
};

export default SpotifileV2Page;
