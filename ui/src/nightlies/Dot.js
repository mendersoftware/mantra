import { Circle, Replay } from '@mui/icons-material';
import { IconButton, Stack, Tooltip, Typography } from '@mui/material';

import { buildStatusColor } from '../constants';

export const Dot = props => {
  const { item } = props;
  return (
    <Stack key={item.path} sx={{ alignItems: 'center', position: 'relative' }}>
      <Tooltip
        arrow
        title={
          <>
            <div style={{ fontSize: '16px' }}>{item.name}</div>
            {new Date(item.startedAt).toLocaleString()}
            {Object.entries(item.testReportSummary.total).map(([name, value]) => (
              <Stack direction="row" key={name} sx={{ justifyContent: 'space-between' }}>
                <b>{name}</b>
                <div>{Math.ceil(value)}</div>
              </Stack>
            ))}
            {item.hasRetries && (
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <b>Jobs retried</b>
                <div>{item.retriedJobCount}</div>
              </Stack>
            )}
          </>
        }
      >
        <a href={`https://gitlab.com${item.path}`} target="_blank" rel="noreferrer">
          <IconButton color={buildStatusColor(item.status)} edge="start" size="small">
            <Circle color={buildStatusColor(item.status)} />
            {item.hasRetries && (
              <Replay
                sx={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  fontSize: '0.75rem',
                  color: 'action.active'
                }}
              />
            )}
          </IconButton>
        </a>
      </Tooltip>
      {!!Number(item.testReportSummary.total.failed) && <Typography variant="caption">{item.testReportSummary.total.failed}</Typography>}
    </Stack>
  );
};
