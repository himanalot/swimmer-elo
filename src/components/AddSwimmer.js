import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import { supabase } from '../lib/supabase';

function AddSwimmer({ open, onClose, onSwimmerAdded }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    // Extract swimmer ID from URL
    const match = url.match(/swimmer\/(\d+)/);
    if (!match) {
      setError('Invalid SwimCloud URL. Please enter a valid swimmer profile URL.');
      setLoading(false);
      return;
    }

    const swimmerId = match[1];

    try {
      // Call the Supabase Edge Function
      const { data: response, error: functionError } = await supabase.functions.invoke('add-swimmer', {
        body: { swimmerId }
      });

      if (functionError) {
        console.error('Function error:', functionError);
        throw functionError;
      }

      if (response?.data) {
        setSuccess(true);
        if (onSwimmerAdded) onSwimmerAdded(response.data);
        
        setTimeout(() => {
          onClose();
          setUrl('');
          setSuccess(false);
        }, 2000);
      } else {
        throw new Error('Failed to add swimmer');
      }
    } catch (err) {
      console.error('Error adding swimmer:', err);
      setError(err.message || 'Failed to add swimmer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Add Yourself to Aura
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1" gutterBottom>
            Enter your SwimCloud profile URL to add yourself to the rankings.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Example: https://www.swimcloud.com/swimmer/123456/
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="SwimCloud Profile URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              error={!!error}
              helperText={error}
              sx={{ mb: 2 }}
            />
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Successfully added to rankings!
              </Alert>
            )}
          </form>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !url}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          Add Swimmer
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddSwimmer; 