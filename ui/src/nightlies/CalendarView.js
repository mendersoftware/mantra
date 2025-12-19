import { useCallback } from 'react';
import { Calendar, dayjsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import dayjs from 'dayjs';

import { Dot } from './Dot';

const localizer = dayjsLocalizer(dayjs);

const eventContainerStyles = {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center'
};

// rough measurements to determine a usable calendar height screen sizes
const rowScale = 2.75;
const errorRowHeight = 55;
const dateHeaderHeight = 23;
const weekCount = 5;
const titleHeight = 39;
const monthHeaderHeight = 21;
const height = (rowScale * errorRowHeight + dateHeaderHeight) * weekCount + monthHeaderHeight + titleHeight;

const Event = props => {
  const { event } = props;

  return (
    <div style={eventContainerStyles}>
      {event.data.map((run, i) => (
        <div key={run.startedAt}>
          <Dot item={run} index={i} />
        </div>
      ))}
    </div>
  );
};

const eventPropGetter = event => ({
  style: {
    backgroundColor: event.color || 'transparent',
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
    const event = {
      data: Object.entries(pipelines).map(([key, pipeline]) => ({ ...pipeline, name: key })),
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
      style={{ height }}
      views={{ month: true }}
    />
  );
};
