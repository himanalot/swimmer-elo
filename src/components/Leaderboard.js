import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TablePagination,
  Modal,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Avatar
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import CircularProgress from '@mui/material/CircularProgress';
import { supabase } from '../lib/supabase';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';
import SwimmerProfile from './SwimmerProfile';

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

  return divingEvents.length / events.length > 0.5;
}

export default function Leaderboard({ open, onClose, swimmers }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortedSwimmers, setSortedSwimmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSwimmer, setSelectedSwimmer] = useState(null);

  useEffect(() => {
    setLoading(true);
    
    // First filter out divers and then calculate ranks
    const swimmerArray = Object.values(swimmers)
      .filter(swimmer => !isDiver(swimmer))
      .sort((a, b) => b.elo - a.elo);
    
    // Handle ties by giving same rank to equal ELOs
    let currentRank = 1;
    let currentElo = null;
    let sameRankCount = 0;
    
    const rankedSwimmers = new Map();
    
    swimmerArray.forEach((swimmer) => {
      if (swimmer.elo !== currentElo) {
        currentRank = currentRank + sameRankCount;
        currentElo = swimmer.elo;
        sameRankCount = 1;
      } else {
        sameRankCount++;
      }
      rankedSwimmers.set(swimmer.id, { ...swimmer, rank: currentRank });
    });
    
    // Then filter and preserve original ranks
    const filteredSwimmers = Object.values(swimmers)
      .filter(swimmer => !isDiver(swimmer))  // Filter out divers here too
      .filter(swimmer => 
        swimmer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        swimmer.team.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .map(swimmer => rankedSwimmers.get(swimmer.id))
      .sort((a, b) => a.rank - b.rank); // Sort by rank to maintain leaderboard order
    
    setSortedSwimmers(filteredSwimmers);
    setLoading(false);
  }, [swimmers, searchTerm]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        BackdropProps={{
          sx: {
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(8px)'
          }
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2
        }}
      >
        <Paper 
          elevation={3}
          sx={{ 
            p: 4, 
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            minWidth: 300,
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <CircularProgress size={48} />
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 500,
              color: 'primary.main'
            }}
          >
            Loading Rankings
          </Typography>
          <Typography 
            variant="body2" 
            color="text.secondary"
            align="center"
          >
            Fetching the latest swimmer rankings...
          </Typography>
        </Paper>
      </Modal>
    );
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        BackdropProps={{
          sx: {
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(8px)'
          }
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2
        }}
      >
        <Paper 
          sx={{ 
            width: '100%',
            maxWidth: 1200,
            maxHeight: '90vh',
            overflow: 'auto',
            borderRadius: 2,
            position: 'relative'
          }}
        >
          <Box sx={{ 
            p: 3,
            borderBottom: '1px solid',
            borderColor: 'grey.200',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography variant="h5" sx={{ fontWeight: 500 }}>
              Swimmer Rankings
            </Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'grey.200' }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search by name or team..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            />
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Rank</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Team</TableCell>
                  <TableCell align="right">ELO</TableCell>
                  <TableCell align="right">Ratings</TableCell>
                  <TableCell align="center">Social</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : sortedSwimmers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No rankings available yet
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedSwimmers
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((swimmer) => (
                      <TableRow 
                        key={swimmer.id}
                        hover
                        onClick={() => setSelectedSwimmer(swimmer)}
                        sx={{ 
                          '&:nth-of-type(odd)': {
                            backgroundColor: 'grey.50',
                          },
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          }
                        }}
                      >
                        <TableCell>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 2
                          }}>
                            <Typography 
                              variant="body1" 
                              sx={{ 
                                fontWeight: 500,
                                minWidth: '24px'
                              }}
                            >
                              {swimmer.rank}
                            </Typography>
                            {swimmer.profile_image ? (
                              <Avatar
                                src={swimmer.profile_image}
                                alt={`${swimmer.name} profile`}
                                sx={{ width: 40, height: 40 }}
                              />
                            ) : (
                              <Avatar
                                sx={{ 
                                  width: 40, 
                                  height: 40,
                                  bgcolor: 'grey.200',
                                  color: 'grey.700',
                                  fontSize: '1rem'
                                }}
                              >
                                {swimmer.initials}
                              </Avatar>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>{swimmer.name}</TableCell>
                        <TableCell>{swimmer.team}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 500 }}>
                          {Math.round(swimmer.elo)}
                        </TableCell>
                        <TableCell align="right">
                          {swimmer.ratings_count || 0}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            {swimmer.twitter && (
                              <IconButton 
                                href={swimmer.twitter} 
                                target="_blank"
                                size="small"
                                sx={{ color: 'grey.700' }}
                              >
                                <TwitterIcon fontSize="small" />
                              </IconButton>
                            )}
                            {swimmer.instagram && (
                              <IconButton 
                                href={swimmer.instagram} 
                                target="_blank"
                                size="small"
                                sx={{ color: 'grey.700' }}
                              >
                                <InstagramIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={sortedSwimmers.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      </Modal>

      {selectedSwimmer && (
        <SwimmerProfile
          swimmer={selectedSwimmer}
          open={!!selectedSwimmer}
          onClose={() => setSelectedSwimmer(null)}
        />
      )}
    </>
  );
} 