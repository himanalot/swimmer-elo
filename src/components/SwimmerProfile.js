import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Avatar,
  Divider,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';
import { organizeEventsByPoints } from '../utils/pointsCalculator';

export default function SwimmerProfile({ swimmer, open, onClose }) {
  const { scoredEvents, unscoredEvents, overallScore } = organizeEventsByPoints(swimmer.best_times || {});

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'primary.main',
          color: 'white',
          py: 2
        }}
      >
        <Typography variant="h6" component="div">
          Swimmer Profile
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{ color: 'white' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 3 }}>
          {/* Header with Avatar and Basic Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={swimmer.profile_image}
                sx={{ 
                  width: 100, 
                  height: 100,
                  bgcolor: 'primary.main',
                  fontSize: '2rem'
                }}
              >
                {swimmer.initials}
              </Avatar>
              <Box
                sx={{
                  position: 'absolute',
                  bottom: -10,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  bgcolor: 'primary.main',
                  color: 'white',
                  px: 2,
                  py: 0.5,
                  borderRadius: 2,
                  fontSize: '0.875rem',
                  fontWeight: 'medium'
                }}
              >
                #{swimmer.rank}
              </Box>
            </Box>
            <Box sx={{ ml: 3 }}>
              <Typography variant="h5" gutterBottom>
                {swimmer.name}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                {swimmer.team}
              </Typography>
              
              {/* Social Media Links */}
              <Box sx={{ mt: 1 }}>
                {swimmer.twitter && (
                  <IconButton 
                    component={Link} 
                    href={swimmer.twitter}
                    target="_blank"
                    sx={{ mr: 1 }}
                  >
                    <TwitterIcon />
                  </IconButton>
                )}
                {swimmer.instagram && (
                  <IconButton 
                    component={Link}
                    href={swimmer.instagram}
                    target="_blank"
                  >
                    <InstagramIcon />
                  </IconButton>
                )}
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Stats */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Statistics
            </Typography>
            <Box sx={{ display: 'flex', gap: 4 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  ELO Rating
                </Typography>
                <Typography variant="h5">
                  {Math.round(swimmer.elo)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Performance Score
                </Typography>
                <Typography variant="h5" color="primary.main">
                  {overallScore}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Ratings
                </Typography>
                <Typography variant="h5">
                  {swimmer.ratings_count}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Best Times Table */}
          <Typography variant="h6" gutterBottom>
            Best Times
          </Typography>
          
          {/* Scored Events */}
          {scoredEvents.length > 0 && (
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Event</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Time</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Points</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scoredEvents.map(({ event, time, points }) => (
                    <TableRow key={event}>
                      <TableCell component="th" scope="row">
                        {event}
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'primary.main', fontWeight: 'medium' }}>
                        {time}
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={points}
                          size="small"
                          color="primary"
                          sx={{ 
                            height: 24,
                            minWidth: 60,
                            '& .MuiChip-label': { px: 1 }
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Unscored Events */}
          {unscoredEvents.length > 0 && (
            <>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                Other Times
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Event</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {unscoredEvents.map(({ event, time }) => (
                      <TableRow key={event}>
                        <TableCell component="th" scope="row" sx={{ color: 'text.secondary' }}>
                          {event}
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'text.secondary' }}>
                          {time}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
} 