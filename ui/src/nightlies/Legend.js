import { Circle } from '@mui/icons-material';
import React from 'react';
import { Box, Typography } from '@mui/material';
const legendItems = [
  { color: 'success', title: 'Success' },
  { color: 'warning', title: 'Running' },
  { color: 'error', title: 'Failure' },
  { color: 'inherit', title: 'Canceled' }
];
export const Legend = () => (
  <Box>
    {legendItems.map(item => (
      <Box key={item.color} display="flex">
        <Circle color={item.color} />
        <Typography sx={{ ml: 1 }}> {item.title}</Typography>
      </Box>
    ))}
  </Box>
);
