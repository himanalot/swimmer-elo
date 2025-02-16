import React from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Container,
  Stack,
  Paper
} from '@mui/material';
import WavesBackground from './WavesBackground';
import { motion } from 'framer-motion';

interface HomePageProps {
  onStartRating: () => void;
}

export default function HomePage({ onStartRating }: HomePageProps) {
  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        pt: -8
      }}
    >
      <WavesBackground 
        lineColor="rgba(25, 118, 210, 0.1)"
        waveSpeedX={0.02}
        waveSpeedY={0.01}
      />
      
      <Container maxWidth="md">
        <Stack spacing={4} alignItems="center" textAlign="center">
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
    </Box>
  );
} 