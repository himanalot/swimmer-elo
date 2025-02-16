import React from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

export default function EloChangeDisplay({ oldElo, newElo }) {
  const isIncrease = newElo > oldElo;
  const difference = Math.abs(Math.round(newElo - oldElo));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Box 
        sx={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1
        }}
      >
        {isIncrease ? <TrendingUpIcon color="success" /> : <TrendingDownIcon color="error" />}
        <Typography
          variant="body1"
          color={isIncrease ? 'success.main' : 'error.main'}
          sx={{ fontWeight: 'bold' }}
        >
          {isIncrease ? '+' : '-'}{difference}
        </Typography>
      </Box>
      <Typography 
        variant="caption" 
        color="text.secondary"
        sx={{ 
          display: 'block',
          textAlign: 'center',
          mt: 0.5
        }}
      >
        {Math.round(oldElo)} → {Math.round(newElo)}
      </Typography>
    </motion.div>
  );
} 