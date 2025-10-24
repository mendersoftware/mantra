import { Circle, Replay } from '@mui/icons-material';
import React from 'react';
import { Box, Typography } from '@mui/material';
const legendItems = [
  { color: 'success', title: 'Success' },
  { color: 'warning', title: 'Running' },
  { color: 'error', title: 'Failure' },
  { color: 'inherit', title: 'Canceled' },
  { icon: <Replay />, title: 'Jobs Retried' }
];
export const Legend = () => (
  <Box>
    {legendItems.map(item => (
      <Box key={item.title} display="flex">
        {item.icon || <Circle color={item.color} />}
        <Typography sx={{ ml: 1 }}> {item.title}</Typography>
      </Box>
    ))}
  </Box>
);
