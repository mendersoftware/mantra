import React from 'react';
import { IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { Circle } from '@mui/icons-material';
import { buildStatusColor, openNightlyClick } from '../constants';

export const Dot = props => {
  const { item, index } = props;
  const isTopRow = index < 2;
  return (
    <Stack key={item.path} alignItems="center" style={{ flexDirection: isTopRow ? 'column-reverse' : 'column' }}>
      <Tooltip
        arrow
        title={
          <>
            <div style={{ fontSize: '16px' }}>{item.name}</div>
            {new Date(item.startedAt).toLocaleString()}
            {Object.entries(item.testReportSummary.total).map(([name, value]) => (
              <Stack direction="row" justifyContent="space-between" key={name}>
                <b>{name}</b>
                <div>{Math.ceil(value)}</div>
              </Stack>
            ))}
          </>
        }
      >
        <a href={`https://gitlab.com${item.path}`} target="_blank">
          <IconButton color={buildStatusColor(item.status)} edge="start" size="small">
            <Circle color={buildStatusColor(item.status)} />
          </IconButton>
        </a>
      </Tooltip>
      {!!Number(item.testReportSummary.total.failed) && (
        <Typography style={isTopRow && { position: 'absolute', top: '10px' }} variant="caption">
          {item.testReportSummary.total.failed}
        </Typography>
      )}
    </Stack>
  );
};
