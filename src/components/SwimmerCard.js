import React, { useEffect, useState, useRef } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  List, 
  ListItem, 
  ListItemText,
  Divider,
  Box,
  Paper,
  Chip,
  Stack,
  Avatar,
  IconButton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import EloChangeDisplay from './EloChangeDisplay';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';
import { organizeEventsByPoints } from '../utils/pointsCalculator';

// Emoji configurations
const WINNER_EMOJIS = ['🏆', '⭐', '🌟', '🥇', '💫', '✨'];
const LOSER_EMOJIS = ['💔', '😢', '🥺', '💫', '✨'];
const EMOJI_COUNT = 30;

function EmojiRain({ isWinner, show }) {
  const [emojis, setEmojis] = useState([]);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
  }, [show]);

  useEffect(() => {
    if (show && containerWidth > 0) {
      const emojiSet = isWinner ? WINNER_EMOJIS : LOSER_EMOJIS;
      const newEmojis = Array.from({ length: EMOJI_COUNT }, (_, i) => ({
        id: i,
        emoji: emojiSet[Math.floor(Math.random() * emojiSet.length)],
        startX: Math.random() * containerWidth, // Use actual pixels
        startY: -20 - Math.random() * 50,
        xOffset: (Math.random() - 0.5) * 100, // Pixel-based offset
        delay: Math.random() * 0.8,
        duration: 1.5 + Math.random(),
        rotation: (Math.random() - 0.5) * 360,
        scale: 0.8 + Math.random() * 0.4,
      }));
      setEmojis(newEmojis);
    }
  }, [show, isWinner, containerWidth]);

  if (!show) return null;

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'absolute',
        top: -50,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 1000,
        overflow: 'visible',
      }}
    >
      <AnimatePresence>
        {emojis.map((item) => (
          <motion.div
            key={item.id}
            initial={{ 
              opacity: 0,
              x: item.startX,
              y: item.startY,
              scale: 0,
              rotate: 0
            }}
            animate={{ 
              opacity: [0, 1, 1, 0],
              x: [item.startX, item.startX + item.xOffset],
              y: [item.startY, containerWidth], // Use container width as approximate height
              scale: [0, item.scale, item.scale * 0.8, 0],
              rotate: item.rotation
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: item.duration,
              delay: item.delay,
              ease: "easeIn"
            }}
            style={{
              position: 'absolute',
              fontSize: '28px',
              display: 'inline-block',
              willChange: 'transform',
              left: 0,
              top: 0,
            }}
          >
            {item.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </Box>
  );
}

export default function SwimmerCard({ swimmer, lastMatchResult, onClick, revealed }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isWinner = lastMatchResult?.winner?.id === swimmer.id;
  const isLoser = lastMatchResult?.loser?.id === swimmer.id;
  const hasResult = isWinner || isLoser;
  const cardRef = useRef(null);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  
  const { scoredEvents, unscoredEvents, overallScore } = organizeEventsByPoints(swimmer.best_times || {});
  const hasTimes = scoredEvents.length > 0 || unscoredEvents.length > 0;

  // Handle swipe functionality for mobile
  const handleTouchStart = (e) => {
    if (!isMobile) return;
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    if (!isMobile) return;
    setTouchEnd(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!isMobile || !touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe || isRightSwipe) {
      onClick?.();
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <motion.div
      ref={cardRef}
      whileHover={{ scale: revealed ? 1 : 1.02 }}
      whileTap={{ scale: revealed ? 1 : 0.98 }}
      initial={hasResult ? { scale: 1 } : false}
      animate={hasResult ? { 
        scale: [1, 1.05, 1],
        transition: { duration: 0.3 }
      } : false}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ height: '100%' }}
    >
      <Paper 
        elevation={3}
        onClick={revealed ? null : onClick}
        sx={{
          height: '100%',
          cursor: revealed ? 'default' : 'pointer',
          borderRadius: 2,
          position: 'relative',
          overflow: 'visible',
          border: theme => hasResult ? `2px solid ${isWinner ? theme.palette.success.main : theme.palette.error.main}` : 'none',
          backgroundColor: 'background.paper',
          m: 0,
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            boxShadow: revealed ? 3 : theme => `0 8px 24px ${theme.palette.primary.main}20`
          }
        }}
      >
        <EmojiRain isWinner={isWinner} show={hasResult && revealed} />
        
        {/* Winner/Loser Chip */}
        {hasResult && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                p: 1,
                zIndex: 2
              }}
            >
              <Chip
                icon={isWinner ? <TrendingUpIcon /> : <TrendingDownIcon />}
                label={isWinner ? "Winner" : "Runner-up"}
                color={isWinner ? "success" : "error"}
                size="small"
                sx={{ 
                  fontWeight: 'bold',
                  boxShadow: 2,
                  transition: 'all 0.3s ease-in-out'
                }}
              />
            </Box>
          </motion.div>
        )}

        <Card sx={{ 
          flexGrow: 1, 
          bgcolor: 'background.paper', 
          boxShadow: 'none',
          overflow: 'hidden',
          maxHeight: { xs: 'none', sm: revealed ? 'calc(100vh - 150px)' : 'calc(100vh - 200px)' },
          pb: revealed ? '72px' : 0,
          transition: 'all 0.3s ease-in-out',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <CardContent sx={{ 
            p: { xs: 1, sm: 2 },
            '&:last-child': { pb: { xs: 1, sm: 2 } },
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <Stack spacing={{ xs: 1, sm: 2 }} sx={{ height: '100%', overflow: 'hidden' }}>
              {/* Header Section */}
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'row', sm: 'row' },
                alignItems: { xs: 'center', sm: 'flex-start' },
                gap: { xs: 1, sm: 2 }, 
                mb: { xs: 0.5, sm: 2 },
                filter: revealed ? 'none' : 'blur(5px)',
                pointerEvents: revealed ? 'auto' : 'none',
                py: { xs: 0.5, sm: 1 },
                px: { xs: 0.5, sm: 1 },
                borderRadius: 2,
                bgcolor: 'grey.50',
                transition: 'all 0.3s ease-in-out',
                flexShrink: 0
              }}>
                <Box sx={{ 
                  textAlign: { xs: 'center', sm: 'left' },
                  minWidth: { xs: '36px', sm: '88px' }
                }}>
                  {swimmer.profile_image ? (
                    <Avatar
                      src={swimmer.profile_image}
                      alt={`${swimmer.name} profile`}
                      sx={{ 
                        width: { xs: 36, sm: 88 }, 
                        height: { xs: 36, sm: 88 },
                        border: '2px solid',
                        borderColor: 'grey.200'
                      }}
                    />
                  ) : (
                    <Avatar
                      sx={{ 
                        width: { xs: 36, sm: 88 }, 
                        height: { xs: 36, sm: 88 },
                        bgcolor: 'grey.200',
                        color: 'grey.700',
                        fontSize: { xs: '0.875rem', sm: '1.5rem' },
                        fontWeight: 'medium',
                        border: '2px solid',
                        borderColor: 'grey.200'
                      }}
                    >
                      {swimmer.initials}
                    </Avatar>
                  )}
                </Box>

                <Box sx={{ 
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  minWidth: 0 // Add this to prevent text overflow
                }}>
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      fontWeight: 'bold', 
                      mb: { xs: 0, sm: 1 },
                      fontSize: { xs: '0.875rem', sm: '1.5rem' },
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {swimmer.name}
                  </Typography>
                  <Typography 
                    variant="subtitle1" 
                    color="primary"
                    sx={{ 
                      fontWeight: 'medium', 
                      mb: { xs: 0, sm: 1 },
                      fontSize: { xs: '0.75rem', sm: '1rem' },
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {swimmer.team}
                  </Typography>
                  
                  {/* Social Media Links */}
                  {(swimmer.twitter || swimmer.instagram) && (
                    <Box sx={{ 
                      display: { xs: 'none', sm: 'flex' },
                      gap: 1, 
                      justifyContent: { xs: 'center', sm: 'flex-start' }
                    }}>
                      {swimmer.twitter && (
                        <IconButton 
                          href={swimmer.twitter} 
                          target="_blank"
                          size="small"
                          sx={{ color: 'grey.700' }}
                        >
                          <TwitterIcon />
                        </IconButton>
                      )}
                      {swimmer.instagram && (
                        <IconButton 
                          href={swimmer.instagram} 
                          target="_blank"
                          size="small"
                          sx={{ color: 'grey.700' }}
                        >
                          <InstagramIcon />
                        </IconButton>
                      )}
                    </Box>
                  )}
                </Box>

                {/* ELO Rating */}
                <Box sx={{ 
                  filter: revealed ? 'none' : 'blur(5px)',
                  width: { xs: 'auto', sm: 'auto' }
                }}>
                  <Box sx={{ 
                    bgcolor: 'grey.50',
                    p: { xs: 0.5, sm: 2 },
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'grey.200',
                    minWidth: { xs: 'auto', sm: '140px' },
                    textAlign: 'center'
                  }}>
                    <Typography variant="h4" sx={{ 
                      fontWeight: 'bold', 
                      color: 'grey.800',
                      fontSize: { xs: '1rem', sm: '2.125rem' },
                      lineHeight: { xs: 1.2, sm: 1.5 }
                    }}>
                      {Math.round(swimmer.elo)}
                    </Typography>
                    <Typography 
                      variant="subtitle2" 
                      color="text.secondary" 
                      sx={{
                        fontSize: { xs: '0.625rem', sm: '0.875rem' },
                        lineHeight: { xs: 1.2, sm: 1.5 }
                      }}
                    >
                      ELO
                    </Typography>
                    {hasResult && (
                      <Box sx={{ 
                        mt: { xs: 0.25, sm: 1 },
                        transform: { xs: 'scale(0.8)', sm: 'none' },
                        transformOrigin: 'center'
                      }}>
                        <EloChangeDisplay 
                          oldElo={lastMatchResult[isWinner ? 'winner' : 'loser'].oldElo}
                          newElo={lastMatchResult[isWinner ? 'winner' : 'loser'].newElo}
                        />
                      </Box>
                    )}
                    {overallScore > 0 && (
                      <Box sx={{ 
                        mt: 1, 
                        pt: 1, 
                        borderTop: '1px solid', 
                        borderColor: 'grey.200',
                        display: { xs: 'none', sm: 'block' }
                      }}>
                        <Typography variant="h6" sx={{ 
                          fontWeight: 'bold', 
                          color: 'primary.main',
                          fontSize: { xs: '1rem', sm: '1.25rem' }
                        }}>
                          {overallScore}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Performance Score
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Best Times Section */}
              <Box sx={{ 
                position: 'relative',
                flex: 1,
                minHeight: 0,
                bgcolor: 'grey.50',
                borderRadius: 2,
                overflow: 'auto',
                '&::-webkit-scrollbar': {
                  width: '8px',
                  height: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  background: '#f1f1f1',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#888',
                  borderRadius: '4px',
                  '&:hover': {
                    background: '#666',
                  },
                },
              }}>
                <Box sx={{
                  position: 'sticky',
                  top: 0,
                  bgcolor: 'grey.50',
                  pt: { xs: 1, sm: 2 },
                  px: { xs: 1, sm: 2 },
                  pb: 1,
                  zIndex: 2,
                  borderBottom: '1px solid',
                  borderColor: 'grey.200',
                  backdropFilter: 'blur(8px)',
                  background: 'rgba(245, 245, 245, 0.9)',
                }}>
                  <Typography 
                    variant="h6" 
                    color="primary"
                    sx={{ 
                      fontWeight: 'medium',
                      fontSize: { xs: '0.875rem', sm: '1.25rem' }
                    }}
                  >
                    {isMobile ? 'Top Events' : 'Best Times'}
                  </Typography>
                </Box>
                
                <Box sx={{ p: { xs: 1, sm: 2 }, pt: 1 }}>
                  {/* Scored Events */}
                  {scoredEvents.length > 0 && (
                    <List dense sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                      gap: 1,
                      mt: 1
                    }}>
                      {(isMobile ? scoredEvents.slice(0, 5) : scoredEvents).map(({ event, time, points }) => (
                        <ListItem key={event} sx={{ 
                          bgcolor: 'white',
                          borderRadius: 1,
                          mb: 0.5,
                          border: '1px solid',
                          borderColor: 'grey.200',
                          p: { xs: 1, sm: 2 },
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            bgcolor: 'grey.50'
                          }
                        }}>
                          <ListItemText
                            primary={
                              <Box sx={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                gap: 1
                              }}>
                                <Typography 
                                  variant="body2" 
                                  fontWeight="medium"
                                  sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                                >
                                  {event}
                                </Typography>
                                <Box sx={{ filter: revealed ? 'none' : 'blur(5px)' }}>
                                  <Chip
                                    label={points}
                                    size="small"
                                    color="primary"
                                    variant={points > 800 ? "filled" : "outlined"}
                                    sx={{ 
                                      height: { xs: 16, sm: 20 }, 
                                      '& .MuiChip-label': { 
                                        px: 1, 
                                        fontSize: { xs: '0.625rem', sm: '0.7rem' },
                                        fontWeight: 'bold'
                                      } 
                                    }}
                                  />
                                </Box>
                              </Box>
                            }
                            secondary={
                              <Typography 
                                variant="body2" 
                                color="primary.main"
                                sx={{ 
                                  fontWeight: 'medium',
                                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                }}
                              >
                                {time}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}

                  {/* Unscored Events - Only show on desktop */}
                  {!isMobile && unscoredEvents.length > 0 && (
                    <>
                      <Typography 
                        variant="subtitle2" 
                        color="text.secondary"
                        sx={{ 
                          mt: 2, 
                          mb: 1,
                          fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }}
                      >
                        Other Times
                      </Typography>
                      <List dense sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                        gap: 1 
                      }}>
                        {unscoredEvents.map(({ event, time }) => (
                          <ListItem key={event} sx={{ 
                            bgcolor: 'grey.50',
                            borderRadius: 1,
                            mb: 0.5,
                            border: '1px solid',
                            borderColor: 'grey.100',
                            p: { xs: 1, sm: 2 }
                          }}>
                            <ListItemText
                              primary={
                                <Typography 
                                  variant="body2" 
                                  color="text.secondary" 
                                  fontWeight="medium"
                                  sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                                >
                                  {event}
                                </Typography>
                              }
                              secondary={
                                <Typography 
                                  variant="body2" 
                                  color="text.secondary"
                                  sx={{ 
                                    fontWeight: 'medium',
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                  }}
                                >
                                  {time}
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </>
                  )}
                </Box>
              </Box>

              {/* Ratings Count - Only show on desktop */}
              {!isMobile && swimmer.ratings_count > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: revealed ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Box sx={{ 
                    filter: revealed ? 'none' : 'blur(5px)',
                    display: { xs: 'none', sm: 'block' }
                  }}>
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        fontStyle: 'italic',
                        textAlign: 'center',
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }}
                    >
                      Based on {swimmer.ratings_count} ratings
                    </Typography>
                  </Box>
                </motion.div>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Paper>
    </motion.div>
  );
} 