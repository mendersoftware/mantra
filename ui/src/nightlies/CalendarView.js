import { useMemo } from 'react';
import { Calendar, dayjsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { Replay, Square } from '@mui/icons-material';
import { Box, Link, Stack, Tooltip, Typography } from '@mui/material';

import dayjs from 'dayjs';

import { buildStatusColor } from '../constants';

const localizer = dayjsLocalizer(dayjs);

const statusOrder = { FAILED: 0, RUNNING: 1, CANCELED: 2, SUCCESS: 3 };

// rough measurements to determine a usable calendar height for screen sizes
const rowScale = 2.75;
const errorRowHeight = 55;
const dateHeaderHeight = 23;
const weekCount = 5;
const titleHeight = 39;
const monthHeaderHeight = 21;
const height = (rowScale * errorRowHeight + dateHeaderHeight) * weekCount + monthHeaderHeight + titleHeight;

const SegmentTooltip = ({ run }) => (
  <>
    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{run.name}</div>
    <div>{new Date(run.startedAt).toLocaleString()}</div>
    {run.testReportSummary?.total &&
      Object.entries(run.testReportSummary.total).map(([name, value]) => (
        <Stack direction="row" key={name} sx={{ justifyContent: 'space-between', gap: 2 }}>
          <b>{name}</b>
          <div>{Math.ceil(value)}</div>
        </Stack>
      ))}
    {run.hasRetries && (
      <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
        <b>Jobs retried</b>
        <div>{run.retriedJobCount}</div>
      </Stack>
    )}
  </>
);

const HealthStrip = ({ runs }) => (
  <Stack direction="row" sx={{ gap: 0, flexWrap: 'wrap', justifyContent: 'center' }}>
    {runs.map(run => (
      <Tooltip key={run.name} arrow title={<SegmentTooltip run={run} />}>
        <Link href={`https://gitlab.com${run.path}`} target="_blank" rel="noreferrer">
          <Square color={buildStatusColor(run.status)} sx={{ borderRadius: 2, fontSize: '12px' }} />
        </Link>
      </Tooltip>
    ))}
  </Stack>
);

const FailureTags = ({ failures }) => (
  <Stack direction="column" sx={{ m: 0.25 }}>
    {failures.map(run => {
      const failedCount = Number(run.testReportSummary?.total?.failed) || 0;
      const style = { fontSize: '8pt' };
      return (
        <Tooltip
          key={run.name}
          arrow
          color="white"
          title={
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'end', gap: 0.25 }}>
              {run.hasRetries && <Replay color="action.active" style={style} />}
              {failedCount > 0 && (
                <Typography color="error.light" style={style}>
                  {failedCount} Failed
                </Typography>
              )}
            </Stack>
          }
        >
          <Link href={`https://gitlab.com${run.path}`} target="_blank" rel="noreferrer" color="error" underline="hover" style={style}>
            {run.name}
          </Link>
        </Tooltip>
      );
    })}
  </Stack>
);

const Event = ({ event: { runs, failures } }) => (
  <div>
    <HealthStrip runs={runs} />
    {failures.length > 0 && <FailureTags failures={failures} />}
  </div>
);

const eventPropGetter = () => ({
  style: {
    backgroundColor: 'transparent',
    color: 'black',
    border: 'none',
    padding: '2px'
  }
});

const pipelinesToEvents = pipelinesArr =>
  pipelinesArr.reduce((accu, pipelines) => {
    const keys = Object.keys(pipelines);
    if (!keys.length) {
      return accu;
    }
    const lastKey = keys[keys.length - 1];
    const { shiftedDate } = pipelines[lastKey];
    const runs = Object.entries(pipelines)
      .map(([key, pipeline]) => ({ ...pipeline, name: key }))
      .sort((a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99));
    const failures = runs.filter(r => r.status === 'FAILED');
    const event = {
      runs,
      failures,
      title: '',
      start: new Date(shiftedDate),
      end: new Date(shiftedDate),
      id: shiftedDate,
      allDay: true
    };
    accu.push(event);
    return accu;
  }, []);

export const PipelineCalendar = ({ pipelines = [] }) => {
  const events = useMemo(() => pipelinesToEvents(pipelines), [pipelines]);
  return (
    <Calendar
      components={{ event: Event }}
      localizer={localizer}
      startAccessor="start"
      eventPropGetter={eventPropGetter}
      endAccessor="end"
      events={events}
      toolbar={true}
      style={{ height }}
      views={{ month: true }}
    />
  );
};
