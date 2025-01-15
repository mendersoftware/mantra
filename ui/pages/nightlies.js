import React, { useState } from 'react';

import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import { PipelineCalendar } from '../src/nightlies/CalendarView';
import { PipelineListView } from '../src/nightlies/ListView';
import dayjs from 'dayjs';
import { Legend } from '../src/nightlies/Legend';

const Nightlies = props => {
  const [calendarView, setCalendarView] = useState(true);
  const handleCalendarView = (_, newValue) => {
    setCalendarView(newValue);
  };
  const { nightlies, flatNightlies } = props;
  return (
    <>
      <Typography variant="h4">Mender Nightlies Tests</Typography>
      <Box display="flex" justifyContent="space-between" sx={{ mt: 2, mb: 2 }}>
        <Box>
          <ToggleButtonGroup value={calendarView} exclusive onChange={handleCalendarView}>
            <ToggleButton value={true}>
              <CalendarMonthIcon />
            </ToggleButton>
            <ToggleButton value={false}>
              <FormatListBulletedIcon />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Legend />
      </Box>
      {calendarView ? (
        <PipelineCalendar pipelines={flatNightlies} />
      ) : (
        <Box>
          {Object.entries(nightlies).map(([title, nightly]) => (
            <PipelineListView key={title} nightlies={nightly} title={title} />
          ))}
        </Box>
      )}
    </>
  );
};

const gitlabApiRequestHeaders = { headers: { Authorization: `Bearer ${process.env.GITLAB_TOKEN}` } };
const gitlabPaginationLimit = 100;
export const pipelines = [
  {
    name: 'Integration',
    url: `https://gitlab.com/api/v4/projects/${encodeURIComponent('Northern.tech/Mender/integration')}`,
    pipelineScheduleId: 2676039
  },
  {
    name: 'Mender Client Acceptance Tests',
    url: `https://gitlab.com/api/v4/projects/${encodeURIComponent('Northern.tech/Mender/mender-qa')}`,
    pipelineScheduleId: 30585
  },
  {
    name: 'mender-server-enterprise',
    url: `https://gitlab.com/api/v4/projects/${encodeURIComponent('Northern.tech/Mender/mender-server-enterprise')}`,
    pipelineScheduleId: 2738797
  },
  {
    name: 'mender-server',
    url: `https://gitlab.com/api/v4/projects/${encodeURIComponent('Northern.tech/Mender/mender-server')}`,
    pipelineScheduleId: 2738796
  }
];
export const order = pipelines.map(pipeline => pipeline.name);

const getNightlies = async (accu, options = {}, pipeline) => {
  if (!process.env.GITLAB_TOKEN) {
    return [];
  }
  const { page, limit, cutoffDate } = options;
  const response = await fetch(
    `${pipeline.url}/pipeline_schedules/${pipeline.pipelineScheduleId}/pipelines?per_page=${gitlabPaginationLimit}&page=${page}`,
    gitlabApiRequestHeaders
  );
  const pipelinesFiltered = (await response.json()).filter(obj => new Date(obj.created_at).setHours(0, 0, 0, 0) >= cutoffDate);
  const pipelines = [...accu, ...pipelinesFiltered.reverse()];
  if (page - 1 >= 1 && pipelines.length < limit) {
    return getNightlies(pipelines, { page: Math.max(1, page - 1), limit, cutoffDate }, pipeline);
  }
  return pipelines.slice(0, limit);
};

export const getLatestNightlies = async (cutoffDate, limit = 1, pipeline) => {
  cutoffDate.setHours(0, 0, 0, 0);
  // Ideally, we would order by started date (desc) GitLab API does not support this, so the workaround is to paginate
  // until we collect pipelines, filter by `cutoffDate` and recurse backwards until we have reached `limit` filtered nightlies
  const canaryResponse = await fetch(
    `${pipeline.url}/pipeline_schedules/${pipeline.pipelineScheduleId}/pipelines?per_page=${gitlabPaginationLimit}`,
    gitlabApiRequestHeaders
  );
  const totalPages = await canaryResponse.headers.get('x-total-pages');
  const pipelines = await getNightlies([], { cutoffDate, limit, page: totalPages }, pipeline);

  // Now get the test report summary of each pipeline and construct the final objects to return
  return Promise.all(
    pipelines.map(obj =>
      fetch(`${pipeline.url}/pipelines/${obj.id}/test_report_summary`, gitlabApiRequestHeaders)
        .then(res => res.json())
        .then(data => {
          return {
            path: obj.web_url.replace(/^https:\/\/gitlab.com/, ''),
            status: obj.status.toUpperCase(),
            startedAt: obj.created_at,
            testReportSummary: { total: data.total }
          };
        })
    )
  );
};
const limit = 150;

const getNightliesByPipeline = async pipeline => {
  const today = new Date();
  // deduct today when setting the cutoff date for the retrieved pipelines
  today.setDate(today.getDate() - (limit - 1));
  const latestNightlies = await getLatestNightlies(today, limit, pipeline);
  const { items } = latestNightlies.reduce(
    (accu, item) => {
      const date = new Date(item.startedAt);
      const key = `${date.getUTCFullYear()}-${date.getMonth()}`;
      if (!accu.dates[key]) {
        accu.dates[key] = true;
        accu.items[Object.keys(accu.dates).length] = [];
      }
      accu.items[Object.keys(accu.dates).length].push(item);
      return accu;
    },
    { dates: {}, items: {} }
  );
  return [Object.values(items), latestNightlies];
};
const mergeByDate = pipelines => {
  const today = dayjs();
  const runsMerged = new Array(limit);
  for (let i = 0; i < limit; i++) {
    const currentDay = today.add(-i, 'day');
    pipelines.forEach(pipeline => {
      const matchingRun = pipeline.data.find(run => dayjs(run.startedAt).isSame(currentDay, 'day'));
      if (!matchingRun) return;
      if (runsMerged[i]) {
        runsMerged[i][pipeline.name] = matchingRun;
      } else {
        runsMerged[i] = { [pipeline.name]: matchingRun };
      }
    });
  }
  return runsMerged.filter(item => !!item);
};

export async function getStaticProps() {
  const nightlies = {};
  const nightliesArr = [];
  const pipelineFetch = pipelines.map(async pipeline => {
    const [mixed, plain] = await getNightliesByPipeline(pipeline);
    nightlies[pipeline.name] = mixed;
    nightliesArr.push({ data: plain, name: pipeline.name });
    return nightlies[pipeline.name];
  });
  await Promise.all(pipelineFetch);
  return {
    props: {
      nightlies,
      flatNightlies: mergeByDate(nightliesArr)
    }
  };
}

export default Nightlies;
