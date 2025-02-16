import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Container,
  Stack,
  Paper,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Fade
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import WavesBackground from './WavesBackground';
import { motion } from 'framer-motion';
import SwimmerProfile from './SwimmerProfile';

export default function HomePage({ onStartRating, swimmers }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSwimmer, setSelectedSwimmer] = useState(null);

  // Calculate ranks once for all swimmers
  const rankedSwimmers = React.useMemo(() => {
    const sortedSwimmers = Object.values(swimmers)
      .sort((a, b) => b.elo - a.elo);
    
    // Handle ties by giving same rank to equal ELOs
    let currentRank = 1;
    let currentElo = null;
    let sameRankCount = 0;
    
    const rankedSwimmers = new Map(); // Use a Map to store swimmer data by ID
    
    sortedSwimmers.forEach((swimmer) => {
      if (swimmer.elo !== currentElo) {
        currentRank = currentRank + sameRankCount;
        currentElo = swimmer.elo;
        sameRankCount = 1;
      } else {
        sameRankCount++;
      }
      rankedSwimmers.set(swimmer.id, { ...swimmer, rank: currentRank });
    });
    
    return rankedSwimmers;
  }, [swimmers]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    // Search through all swimmers but keep their original ranks
    const results = Object.values(swimmers)
      .filter(swimmer => {
        const searchLower = query.toLowerCase();
        return swimmer.name.toLowerCase().includes(searchLower) ||
               swimmer.team.toLowerCase().includes(searchLower);
      })
      .map(swimmer => rankedSwimmers.get(swimmer.id)) // Get swimmer with preserved rank
      .slice(0, 10);

    setSearchResults(results);
  };

  return (
    <Box sx={{ 
      width: '100vw',
      minHeight: '100vh',
      position: 'relative',
      left: '50%',
      transform: 'translateX(-50%)',
      px: 0,
      overflow: 'auto'
    }}>
      <WavesBackground 
        lineColor="rgba(25, 118, 210, 0.1)"
        waveSpeedX={0.02}
        waveSpeedY={0.01}
      />
      
      <Container 
        maxWidth={false}
        sx={{ 
          px: 0,
          py: 4,
          minHeight: '100vh',
          maxWidth: '100% !important',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative'
        }}
      >
        {/* Spotify Player - Desktop Only */}
        <Box sx={{ 
          position: 'fixed',
          bottom: 24,
          left: 24,
          width: 300,
          display: { xs: 'none', md: 'block' },
          zIndex: 10
        }}>
          <iframe 
            style={{ borderRadius: '12px' }}
            src="https://open.spotify.com/embed/track/5H4mXWKcicuLKDn4Jy0sK7?utm_source=generator" 
            width="100%" 
            height="152" 
            frameBorder="0" 
            allowFullScreen="" 
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
            loading="lazy"
          />
        </Box>

        <Stack
          spacing={6}
          sx={{
            width: '100%',
            alignItems: 'center',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Typography 
              variant="h2" 
              component="h1"
              sx={{ 
                fontWeight: 800,
                mb: 2,
                background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                backgroundClip: 'text',
                textFillColor: 'transparent',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Rate Top Swimmers
            </Typography>
            
            <Typography 
              variant="h5" 
              color="text.secondary"
              sx={{ mb: 4 }}
            >
              Help rank the best swimmers through head-to-head comparisons
            </Typography>

            <Box sx={{ 
              width: '100%',
              maxWidth: 600, 
              mx: 'auto', 
              mb: 4,
              position: 'relative'
            }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search swimmers by name or team..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ 
                  backgroundColor: 'white',
                  borderRadius: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />
              {searchResults.length > 0 && (
                <Fade in>
                  <Paper 
                    elevation={3}
                    sx={{ 
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      mt: 1,
                      borderRadius: 2,
                      maxHeight: 400,
                      overflow: 'auto',
                      zIndex: 10
                    }}
                  >
                    <List disablePadding>
                      {searchResults.map((swimmer, index) => (
                        <ListItem 
                          key={swimmer.id}
                          button
                          divider={index !== searchResults.length - 1}
                          onClick={() => setSelectedSwimmer(swimmer)}
                          sx={{ 
                            '&:hover': { 
                              backgroundColor: 'grey.50' 
                            }
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography 
                                  component="span" 
                                  sx={{ 
                                    minWidth: '40px',
                                    color: 'text.secondary',
                                    fontWeight: 'medium'
                                  }}
                                >
                                  #{swimmer.rank}
                                </Typography>
                                <Typography component="span">
                                  {swimmer.name}
                                </Typography>
                              </Box>
                            }
                            secondary={swimmer.team}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Fade>
              )}
            </Box>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Paper 
              elevation={3}
              sx={{ 
                p: 3, 
                borderRadius: 4,
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                maxWidth: 500,
                mx: 'auto'
              }}
            >
              <Stack spacing={2}>
                <Typography variant="body1" paragraph>
                  Compare swimmers head-to-head and help establish accurate rankings based on community voting.
                </Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={onStartRating}
                    sx={{
                      py: 1.5,
                      px: 4,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: '1.1rem'
                    }}
                  >
                    Start Rating
                  </Button>
                </Box>
              </Stack>
            </Paper>
          </motion.div>
        </Stack>
      </Container>

      {selectedSwimmer && (
        <SwimmerProfile
          swimmer={selectedSwimmer}
          open={!!selectedSwimmer}
          onClose={() => setSelectedSwimmer(null)}
        />
      )}
    </Box>
  );
} 