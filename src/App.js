import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  Paper,
  Card, 
  CardContent, 
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider,
  AppBar,
  Toolbar,
  IconButton
} from '@mui/material';
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/AuthContext'
import { createClient } from '@supabase/supabase-js'
import Auth from './components/Auth'
import { calculateNewElos } from './utils/eloCalculator';
import EloChangeDisplay from './components/EloChangeDisplay';
import SwimmerCard from './components/SwimmerCard';
import Leaderboard from './components/Leaderboard';
import HomePage from './components/HomePage';
import AuraLogo from './components/AuraLogo';
import AddSwimmer from './components/AddSwimmer';
import { motion } from 'framer-motion';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY  // Use the anon key for client-side
);

// Add this function before the App component
function isDiver(swimmer) {
  // Return true (exclude) if swimmer has no events
  if (!swimmer.best_times || Object.keys(swimmer.best_times).length === 0) {
    return true;
  }

  const events = Object.keys(swimmer.best_times);
  const divingEvents = events.filter(event => 
    event.toUpperCase().includes('DIVING') || 
    event.toUpperCase().includes('DIVE') ||
    event.toUpperCase().includes('PLATFORM') ||
    event.toUpperCase().includes('SPRINGBOARD')
  );

  // If more than 50% of events are diving events, consider them a diver
  return divingEvents.length / events.length > 0.5;
}

// Add this before the App component
const NextPairButton = ({ onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 20 }}
    transition={{ duration: 0.3 }}
  >
    <Button
      variant="contained"
      onClick={onClick}
      sx={{
        borderRadius: '100px',
        textTransform: 'none',
        fontWeight: 500,
        px: 4,
        py: 1.5,
        fontSize: '1.1rem',
        background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(8px)',
        '&:hover': {
          background: theme => `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.2)',
          transform: 'translateY(-2px)'
        },
        transition: 'all 0.3s ease-in-out'
      }}
    >
      Next Pair →
    </Button>
  </motion.div>
);

function App() {
  const [swimmers, setSwimmers] = useState({});
  const [currentPair, setCurrentPair] = useState(null);
  const [ratingCount, setRatingCount] = useState(0);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const { user } = useAuth();
  const [lastMatchResult, setLastMatchResult] = useState(null);
  const [showHomepage, setShowHomepage] = useState(!currentPair);
  const [eloSubscription, setEloSubscription] = useState(null);
  const [isAddSwimmerOpen, setIsAddSwimmerOpen] = useState(false);

  // Add loadSwimmers as a memoized function so we can reuse it
  const loadSwimmers = React.useCallback(async () => {
    try {
      // First get all swimmers from Supabase - this is our source of truth
      let allRatings = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: ratings, error, count } = await supabase
          .from('swimmer_ratings')
          .select('*', { count: 'exact' })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;

        if (ratings.length > 0) {
          allRatings = [...allRatings, ...ratings];
          page++;
          hasMore = ratings.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      // Load swimmers.json data as fallback
      let swimmerData = {};
      try {
        const response = await fetch('/swimmers.json');
        swimmerData = await response.json();
      } catch (err) {
        swimmerData = {};
      }

      // Create new swimmers object merging both sources
      const newSwimmers = {};
      
      // Process all swimmers from Supabase
      for (const rating of allRatings) {
        const jsonData = swimmerData[rating.id] || {};
        
        // Ensure best_times is always an object
        const best_times = rating.best_times || jsonData.best_times || {};
        
        newSwimmers[rating.id] = {
          id: rating.id,
          name: rating.name,
          team: rating.team,
          elo: rating.elo,
          ratings_count: rating.ratings_count,
          best_times: best_times,
          profile_image: rating.profile_image || jsonData.profile_image || null,
          twitter: rating.twitter || jsonData.twitter || null,
          instagram: rating.instagram || jsonData.instagram || null,
          initials: rating.name.split(' ').map(n => n[0]).join('').toUpperCase()
        };

        // If we have best times from swimmers.json but not in Supabase, update Supabase
        if ((!rating.best_times || Object.keys(rating.best_times).length === 0) && 
            jsonData.best_times && Object.keys(jsonData.best_times).length > 0) {
          await supabase
            .from('swimmer_ratings')
            .update({
              best_times: jsonData.best_times,
              profile_image: jsonData.profile_image,
              twitter: jsonData.twitter,
              instagram: jsonData.instagram
            })
            .eq('id', rating.id);
        }
      }
      
      setSwimmers(newSwimmers);
    } catch (err) {
      // Only log critical errors
      console.error('Error loading swimmers:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadSwimmers();
  }, [loadSwimmers]);

  useEffect(() => {
    if (user) {
      // Fetch user's rating count from Supabase
      const fetchRatingCount = async () => {
        const { data, error } = await supabase
          .from('user_stats')
          .select('ratings_count')
          .eq('id', user.id)
          .single()
        
        if (!error && data) {
          setRatingCount(data.ratings_count)
        }
      }
      fetchRatingCount()
    }
  }, [user])

  // Separate effect for subscription to avoid cleanup issues
  useEffect(() => {
    let subscription = null;

    const setupSubscription = async () => {
      // Clean up any existing subscription
      if (eloSubscription) {
        await supabase.removeChannel(eloSubscription);
      }

      // Create a new real-time subscription
      subscription = supabase
        .channel('swimmer_ratings_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'swimmer_ratings'
          },
          async () => {
            await loadSwimmers();
          }
        )
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await loadSwimmers();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setTimeout(setupSubscription, 5000);
          }
        });

      setEloSubscription(subscription);
    };

    setupSubscription();

    // Cleanup function
    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [loadSwimmers]);

  const getRandomPair = () => {
    setRevealed(false);
    setLastMatchResult(null);
    setShowHomepage(false);
    
    // Filter out divers from the swimmers
    const eligibleSwimmers = Object.values(swimmers).filter(swimmer => !isDiver(swimmer));
    
    if (eligibleSwimmers.length < 2) {
      console.warn('Not enough eligible swimmers for comparison');
      return;
    }

    // Sort swimmers by ELO
    const sortedSwimmers = eligibleSwimmers.sort((a, b) => b.elo - a.elo);
    
    // Start with a small ELO range and gradually increase it until we find a pair
    let eloWindow = 50; // Initial ELO difference window
    const maxWindow = 500; // Maximum ELO difference we'll allow
    const windowStep = 50; // How much to increase the window each time
    
    while (eloWindow <= maxWindow) {
      // For each swimmer, try to find another swimmer within the ELO window
      const potentialPairs = [];
      
      for (let i = 0; i < sortedSwimmers.length; i++) {
        for (let j = i + 1; j < sortedSwimmers.length; j++) {
          const eloDiff = Math.abs(sortedSwimmers[i].elo - sortedSwimmers[j].elo);
          if (eloDiff <= eloWindow) {
            potentialPairs.push([sortedSwimmers[i], sortedSwimmers[j]]);
          }
        }
      }
      
      if (potentialPairs.length > 0) {
        // Randomly select one of the valid pairs
        const randomPairIndex = Math.floor(Math.random() * potentialPairs.length);
        const [left, right] = potentialPairs[randomPairIndex];
        
        console.log(`Found pair with ELO difference: ${Math.abs(left.elo - right.elo)}`);
        setCurrentPair({ left, right });
        return;
      }
      
      // If no pairs found, increase the window
      eloWindow += windowStep;
    }
    
    // If we still haven't found a pair, just pick two random swimmers
    console.log('No close ELO matches found, selecting random pair');
    const idx1 = Math.floor(Math.random() * sortedSwimmers.length);
    let idx2 = Math.floor(Math.random() * (sortedSwimmers.length - 1));
    if (idx2 >= idx1) idx2++;
    
    setCurrentPair({
      left: sortedSwimmers[idx1],
      right: sortedSwimmers[idx2]
    });
  };

  const updateElo = async (winner, loser) => {
    const { winnerNewElo, loserNewElo, eloChange } = calculateNewElos(winner, loser);
    
    try {
      // Update Supabase first
      const [winnerUpdate, loserUpdate] = await Promise.all([
        supabase
          .from('swimmer_ratings')
          .upsert({ 
            id: winner.id,
            name: winner.name,
            team: winner.team,
            elo: winnerNewElo,
            ratings_count: (winner.ratings_count || 0) + 1,
            best_times: winner.best_times || {},
            profile_image: winner.profile_image,
            twitter: winner.twitter,
            instagram: winner.instagram
          }),
        supabase
          .from('swimmer_ratings')
          .upsert({ 
            id: loser.id,
            name: loser.name,
            team: loser.team,
            elo: loserNewElo,
            ratings_count: (loser.ratings_count || 0) + 1,
            best_times: loser.best_times || {},
            profile_image: loser.profile_image,
            twitter: loser.twitter,
            instagram: loser.instagram
          })
      ]);

      if (winnerUpdate.error || loserUpdate.error) {
        throw new Error('Failed to update ratings');
      }

      // Update local state
      setSwimmers(prev => ({
        ...prev,
        [winner.id]: { 
          ...winner, 
          elo: winnerNewElo,
          ratings_count: (winner.ratings_count || 0) + 1 
        },
        [loser.id]: { 
          ...loser, 
          elo: loserNewElo,
          ratings_count: (loser.ratings_count || 0) + 1 
        }
      }));

      setLastMatchResult({
        winner: {
          ...winner,
          oldElo: winner.elo,
          newElo: winnerNewElo
        },
        loser: {
          ...loser,
          oldElo: loser.elo,
          newElo: loserNewElo
        },
        eloChange
      });

      // Record match history
      if (user) {
        await supabase.from('match_history').insert({
          user_id: user.id,
          winner_id: winner.id,
          loser_id: loser.id,
          winner_old_elo: winner.elo,
          loser_old_elo: loser.elo,
          winner_new_elo: winnerNewElo,
          loser_new_elo: loserNewElo,
          elo_change: eloChange
        });

        // Update user's total impact
        await supabase
          .from('user_stats')
          .update({ 
            total_impact: (await supabase
              .from('user_stats')
              .select('total_impact')
              .eq('id', user.id)
              .single()
            ).data.total_impact + eloChange
          })
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('Error updating ratings:', error);
      // You might want to add error handling UI here
    }
  };

  const handleChoice = async (choice) => {
    if (!currentPair || revealed) return;
    
    if (!user && ratingCount >= 5) {
      setIsAuthOpen(true);
      return;
    }
    
    setRevealed(true);
    
    if (choice === 'left') {
      await updateElo(currentPair.left, currentPair.right);
    } else {
      await updateElo(currentPair.right, currentPair.left);
    }
    
    // Update rating count
    const newCount = ratingCount + 1;
    setRatingCount(newCount);
    
    if (user) {
      // Update count in Supabase
      await supabase
        .from('user_stats')
        .update({ ratings_count: newCount })
        .eq('id', user.id);
    }
  };

  return (
    <Box sx={{ 
      width: '100vw',
      minHeight: '100vh',
      margin: 0,
      padding: 0,
      overflow: 'auto',
      position: 'relative'
    }}>
      {/* Navigation Buttons */}
      <Box sx={{ 
        position: 'fixed',
        top: { xs: 'auto', sm: 16 },
        bottom: { xs: 16, sm: 'auto' },
        right: 16,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 1,
        zIndex: theme => theme.zIndex.drawer + 1,
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(8px)',
        borderRadius: 2,
        p: 1
      }}>
        <Button 
          variant="outlined"
          onClick={getRandomPair}
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 500,
            width: { xs: '120px', sm: 'auto' }
          }}
        >
          Vote
        </Button>
        <Button 
          variant="outlined"
          onClick={() => setIsLeaderboardOpen(true)}
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 500,
            width: { xs: '120px', sm: 'auto' }
          }}
        >
          Leaderboard
        </Button>
        <Button 
          variant="outlined"
          onClick={() => setIsAddSwimmerOpen(true)}
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 500,
            width: { xs: '120px', sm: 'auto' }
          }}
        >
          Add Yourself
        </Button>
        {user ? (
          <Button
            variant="outlined"
            onClick={() => supabase.auth.signOut()}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
              width: { xs: '120px', sm: 'auto' }
            }}
          >
            Sign Out
          </Button>
        ) : (
          <Button
            variant="outlined"
            onClick={() => setIsAuthOpen(true)}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
              width: { xs: '120px', sm: 'auto' }
            }}
          >
            Sign In
          </Button>
        )}
      </Box>

      {/* Logo */}
      <Box sx={{ 
        position: 'fixed',
        top: 16,
        left: 16,
        zIndex: theme => theme.zIndex.drawer + 1
      }}>
        <AuraLogo onClick={() => {
          setShowHomepage(true);
          setCurrentPair(null);
        }} />
      </Box>

      {/* Main Content */}
      <Container 
        maxWidth={false} 
        sx={{ 
          pt: { xs: 8, sm: 12 },
          pb: { xs: 10, sm: 4 },
          px: { xs: 1, sm: 2 },
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {showHomepage ? (
          <HomePage 
            onStartRating={getRandomPair}
            swimmers={swimmers}
          />
        ) : currentPair ? (
          <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            mt: { xs: 4, sm: 0 }
          }}>
            <Box sx={{ 
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              width: '100%',
              alignItems: 'stretch',
              justifyContent: 'center'
            }}>
              <Box sx={{ 
                flex: 1,
                maxWidth: { xs: '100%', sm: '45%' },
                cursor: !revealed ? 'pointer' : 'default'
              }} onClick={() => handleChoice('left')}>
                <SwimmerCard 
                  swimmer={currentPair.left}
                  revealed={revealed}
                  lastMatchResult={lastMatchResult}
                />
              </Box>
              <Box sx={{ 
                flex: 1,
                maxWidth: { xs: '100%', sm: '45%' },
                cursor: !revealed ? 'pointer' : 'default'
              }} onClick={() => handleChoice('right')}>
                <SwimmerCard 
                  swimmer={currentPair.right}
                  revealed={revealed}
                  lastMatchResult={lastMatchResult}
                />
              </Box>
            </Box>
            
            {/* Next Pair Button */}
            {revealed && (
              <Box sx={{ 
                position: 'fixed',
                bottom: { xs: 24, sm: 32 },
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: theme => theme.zIndex.drawer + 2
              }}>
                <Button
                  variant="contained"
                  onClick={getRandomPair}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 500,
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    boxShadow: theme => `0 8px 24px ${theme.palette.primary.main}40`,
                    '&:hover': {
                      boxShadow: theme => `0 12px 32px ${theme.palette.primary.main}60`
                    }
                  }}
                >
                  Next Pair
                </Button>
              </Box>
            )}
          </Box>
        ) : null}
      </Container>

      {/* Dialogs */}
      <Auth open={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <Leaderboard 
        open={isLeaderboardOpen} 
        onClose={() => setIsLeaderboardOpen(false)}
        swimmers={swimmers}
      />
      <AddSwimmer 
        open={isAddSwimmerOpen}
        onClose={() => setIsAddSwimmerOpen(false)}
        onSwimmerAdded={loadSwimmers}
      />
    </Box>
  );
}

export default function AppWithAuth() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  )
} 