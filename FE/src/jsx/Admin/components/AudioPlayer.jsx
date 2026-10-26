import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Box,
    IconButton,
    Slider,
    Typography,
    Paper,
    Tooltip,
    CircularProgress,
    Fade
} from '@mui/material';
import {
    PlayArrow,
    Pause,
    VolumeUp,
    VolumeOff,
    VolumeDown,
    GraphicEq
} from '@mui/icons-material';

const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
};

const AudioPlayer = ({ src, title = 'Call Recording', autoPlay = false }) => {
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [loading, setLoading] = useState(false); // Start as false - lazy load
    const [error, setError] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false); // Track if audio has been loaded
    const audioRef = useRef(null);
    const containerRef = useRef(null);
    const previousSrcRef = useRef(null);

    // Intersection Observer: Only load audio when player is visible
    useEffect(() => {
        if (!containerRef.current || !src) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    // When player becomes visible, preload metadata (but not full audio)
                    if (entry.isIntersecting && !isInitialized && audioRef.current) {
                        // Only load metadata, not full audio
                        audioRef.current.preload = 'metadata';
                        // Don't call load() yet - wait for user to click play
                    }
                });
            },
            { threshold: 0.1 } // Trigger when 10% visible
        );

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [src, isInitialized]);

    // Reset state when src changes to prevent glitch
    useEffect(() => {
        if (previousSrcRef.current !== src && previousSrcRef.current !== null) {
            // Source changed - reset everything
            setPlaying(false);
            setCurrentTime(0);
            setDuration(0);
            setLoading(false);
            setError(null);
            setIsInitialized(false);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                // Don't reload - wait for user interaction
            }
        }
        previousSrcRef.current = src;
    }, [src]);

    // Initialize audio element (only set up event listeners, don't load)
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !src) return;

        // Set initial volume
        audio.volume = muted ? 0 : volume;
        audio.preload = 'none'; // Don't preload anything initially

        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => {
            if (audio.duration && !isNaN(audio.duration)) {
                setDuration(audio.duration);
            }
            setLoading(false);
        };
        const handleEnded = () => {
            setPlaying(false);
            setCurrentTime(0);
        };
        const handleError = (e) => {
            setError('Failed to load audio');
            setLoading(false);
            console.error('Audio error:', e);
        };
        const handleCanPlay = () => {
            setLoading(false);
            setError(null);
        };
        const handleLoadStart = () => {
            setLoading(true);
        };
        const handleLoadedMetadata = () => {
            if (audio.duration && !isNaN(audio.duration)) {
                setDuration(audio.duration);
            }
            setLoading(false);
        };

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('durationchange', updateDuration);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);
        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('loadstart', handleLoadStart);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('durationchange', updateDuration);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('error', handleError);
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('loadstart', handleLoadStart);
        };
    }, [src, volume, muted, isInitialized]);

    // Update volume when it changes
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = muted ? 0 : volume;
        }
    }, [volume, muted]);

    // Initialize audio on first play (lazy loading)
    const initializeAudio = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || !src || isInitialized) return;

        setLoading(true);
        setIsInitialized(true);
        // Now load the audio metadata
        audio.preload = 'auto';
        audio.load();
    }, [src, isInitialized]);

    const togglePlay = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || !src) return;

        // Initialize audio on first play (lazy loading)
        if (!isInitialized) {
            initializeAudio();
            // Wait a bit for metadata to load, then play
            const tryPlay = () => {
                if (audio.readyState >= 2) { // HAVE_CURRENT_DATA
                    audio.play()
                        .then(() => {
                            setPlaying(true);
                            setLoading(false);
                        })
                        .catch((err) => {
                            console.error('Play error:', err);
                            setError('Failed to play audio');
                            setLoading(false);
                        });
                } else {
                    // Wait for metadata
                    setTimeout(tryPlay, 100);
                }
            };
            tryPlay();
            return;
        }

        if (playing) {
            audio.pause();
            setPlaying(false);
        } else {
            audio.play()
                .then(() => setPlaying(true))
                .catch((err) => {
                    console.error('Play error:', err);
                    setError('Failed to play audio');
                });
        }
    }, [playing, isInitialized, initializeAudio, src]);

    const handleSeek = (event, newValue) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = newValue;
        setCurrentTime(newValue);
    };

    const handleVolumeChange = (event, newValue) => {
        const audio = audioRef.current;
        if (!audio) return;
        const newVolume = newValue / 100;
        setVolume(newVolume);
        audio.volume = muted ? 0 : newVolume;
    };

    const toggleMute = () => {
        const audio = audioRef.current;
        if (!audio) return;
        const newMuted = !muted;
        setMuted(newMuted);
        audio.volume = newMuted ? 0 : volume;
    };

    if (!src) {
        return null;
    }

    return (
        <Fade in={true} timeout={300}>
            <Paper
                ref={containerRef}
                elevation={3}
                sx={{
                    p: 2.5,
                    borderRadius: 3,
                    bgcolor: (theme) => theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.05)' 
                        : 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid',
                    borderColor: 'divider',
                    background: (theme) => theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, rgba(25, 118, 210, 0.05) 100%)'
                        : 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(255, 255, 255, 0.95) 100%)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                        boxShadow: 6,
                        transform: 'translateY(-2px)'
                    }
                }}
            >
                {title && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <GraphicEq sx={{ fontSize: 20, color: 'primary.main' }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                            {title}
                        </Typography>
                    </Box>
                )}
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                    {/* Play/Pause Button */}
                    <Tooltip title={playing ? 'Pause' : 'Play'} arrow>
                        <IconButton
                            onClick={togglePlay}
                            disabled={loading || !!error}
                            color="primary"
                            sx={{
                                bgcolor: 'primary.main',
                                color: 'white',
                                '&:hover': {
                                    bgcolor: 'primary.dark',
                                    transform: 'scale(1.1)'
                                },
                                width: 56,
                                height: 56,
                                boxShadow: 3,
                                transition: 'all 0.2s ease-in-out',
                                '&:disabled': {
                                    bgcolor: 'action.disabledBackground',
                                    color: 'action.disabled'
                                }
                            }}
                        >
                            {loading ? (
                                <CircularProgress size={28} sx={{ color: 'white' }} />
                            ) : playing ? (
                                <Pause sx={{ fontSize: 32 }} />
                            ) : (
                                <PlayArrow sx={{ fontSize: 32 }} />
                            )}
                        </IconButton>
                    </Tooltip>

                    {/* Time Display and Progress */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Slider
                            value={currentTime}
                            max={duration || 100}
                            onChange={handleSeek}
                            disabled={loading || !!error}
                            sx={{
                                color: 'primary.main',
                                '& .MuiSlider-thumb': {
                                    width: 16,
                                    height: 16,
                                    boxShadow: 2,
                                    '&:hover': {
                                        boxShadow: 4,
                                        width: 18,
                                        height: 18
                                    }
                                },
                                '& .MuiSlider-track': {
                                    height: 5,
                                    borderRadius: 1
                                },
                                '& .MuiSlider-rail': {
                                    height: 5,
                                    borderRadius: 1,
                                    opacity: 0.3
                                }
                            }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography 
                                variant="caption" 
                                sx={{ 
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    color: 'text.secondary',
                                    fontFamily: 'monospace'
                                }}
                            >
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </Typography>
                            {error && (
                                <Typography variant="caption" color="error" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                    {error}
                                </Typography>
                            )}
                        </Box>
                    </Box>

                    {/* Volume Control */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 140 }}>
                        <Tooltip title={muted ? 'Unmute' : 'Mute'} arrow>
                            <IconButton
                                onClick={toggleMute}
                                size="small"
                                color={muted ? 'error' : 'default'}
                                sx={{
                                    '&:hover': {
                                        transform: 'scale(1.1)'
                                    },
                                    transition: 'transform 0.2s ease-in-out'
                                }}
                            >
                                {muted ? (
                                    <VolumeOff sx={{ fontSize: 22 }} />
                                ) : volume > 0.5 ? (
                                    <VolumeUp sx={{ fontSize: 22 }} />
                                ) : (
                                    <VolumeDown sx={{ fontSize: 22 }} />
                                )}
                            </IconButton>
                        </Tooltip>
                        <Slider
                            value={muted ? 0 : volume * 100}
                            onChange={handleVolumeChange}
                            sx={{
                                color: 'primary.main',
                                width: 100,
                                '& .MuiSlider-thumb': {
                                    width: 14,
                                    height: 14,
                                    boxShadow: 1
                                },
                                '& .MuiSlider-track': {
                                    height: 4,
                                    borderRadius: 1
                                },
                                '& .MuiSlider-rail': {
                                    height: 4,
                                    borderRadius: 1,
                                    opacity: 0.3
                                }
                            }}
                        />
                    </Box>
                </Box>

                <audio
                    key={src} // Force remount when src changes
                    ref={audioRef}
                    src={src}
                    preload="none" // Lazy load - don't load until user clicks play
                />
            </Paper>
        </Fade>
    );
};

export default AudioPlayer;
