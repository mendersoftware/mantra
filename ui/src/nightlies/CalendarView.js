import React, { useCallback, useMemo } from 'react';
import { Calendar, dayjsLocalizer } from 'react-big-calendar';
import dayjs from 'dayjs';
const localizer = dayjsLocalizer(dayjs);
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Dot } from './Dot';
import { order } from '../../pages/nightlies';

const eventContainerStyles = {
  display: 'flex',
  flexWrap: 'wrap',
  margin: 'auto',
  width: '60px'
};
const Event = ({ event }) => {
  const runs = order.reduce((acc, name) => {
    const run = event.data.find(pipeLineRun => pipeLineRun.name === name);
    return run ? [...acc, run] : acc;
  }, []);
  return (
    <div style={eventContainerStyles}>
      {runs.map((run, i) => (
        <div key={run.startedAt}>
          <Dot item={run} index={i} />
        </div>
      ))}
    </div>
  );
};

export const PipelineCalendar = props => {
  const { pipelines } = props;

  const eventPropGetter = event => {
    return {
      style: {
        backgroundColor: event.color || 'transparent',
        color: 'black',
        border: 'none',
        padding: '2px'
      }
    };
  };
  const pipelinesToEvents = useCallback(pipelinesArr => {
    const events = [];
    pipelinesArr.forEach(pipelines => {
      const event = { data: [], title: '', allDay: true };
      Object.keys(pipelines).forEach(key => {
        event.data.push({ ...pipelines[key], name: key });
        event.start = new Date(pipelines[key].startedAt);
        event.end = new Date(pipelines[key].startedAt);
        event.id = pipelines[key].startedAt;
      });
      events.push(event);
    });
    return events;
  }, []);
  const events = pipelinesToEvents(pipelines);
  return (
    <Calendar
      components={{ event: Event }}
      localizer={localizer}
      startAccessor="start"
      eventPropGetter={eventPropGetter}
      endAccessor="end"
      events={events}
      toolbar={true}
      style={{ height: 600 }}
    />
  );
};
