import React, { useState } from 'react';

import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import { PipelineCalendar } from '../src/nightlies/CalendarView';
import { PipelineListView } from '../src/nightlies/ListView';
import dayjs from 'dayjs';
import { Legend } from '../src/nightlies/Legend';
import { request, gql } from 'graphql-request';

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
const gitlabProjectPipelineBaseUrl = 'https://gitlab.com/api/v4/projects/';
const gitlabGraphqlUrl = 'https://gitlab.com/api/graphql';
const gitlabPaginationLimit = 100;

// GraphQL query to fetch test report summary and jobs for a single pipeline
const pipelineEnrichmentQuery = gql`
  query getPipelineDetails($projectPath: ID!, $iid: ID!) {
    project(fullPath: $projectPath) {
      pipeline(iid: $iid) {
        testReportSummary {
          total {
            count
            error
            failed
            skipped
            success
          }
        }
        jobs {
          nodes {
            name
            status
            retried
          }
        }
      }
    }
  }
`;

export const pipelines = [
  {
    name: 'Integration mender-server:main',
    projectPath: 'Northern.tech/Mender/integration',
    pipelineScheduleId: 2676039
  },
  {
    name: 'Integration mender-server:4.0.x',
    projectPath: 'Northern.tech/Mender/integration',
    pipelineScheduleId: 2766723
  },
  {
    name: 'Mender Client Acceptance Tests',
    projectPath: 'Northern.tech/Mender/mender-qa',
    pipelineScheduleId: 30585
  },
  {
    name: 'mender-server-enterprise',
    projectPath: 'Northern.tech/Mender/mender-server-enterprise',
    pipelineScheduleId: 2738797
  },
  {
    name: 'mender-server',
    projectPath: 'Northern.tech/Mender/mender-server',
    pipelineScheduleId: 2738796
  },
  {
    name: 'mender-gateway:master',
    projectPath: 'Northern.tech/Mender/mender-gateway',
    pipelineScheduleId: 2874910
  },
  {
    name: 'mender-gateway:2.0.x',
    projectPath: 'Northern.tech/Mender/mender-gateway',
    pipelineScheduleId: 2874911
  },
  {
    name: 'mender-orchestrator',
    projectPath: 'Northern.tech/Mender/mender-orchestrator',
    pipelineScheduleId: 2758204
  }
];
export const order = pipelines.map(pipeline => pipeline.name);

const calculateRetryInfo = jobs => {
  if (!jobs || jobs.length === 0) {
    return { hasRetries: false, retriedJobCount: 0 };
  }

  // Group jobs by name to detect retries
  const jobsByName = jobs.reduce((acc, job) => {
    if (!acc[job.name]) acc[job.name] = [];
    acc[job.name].push(job);
    return acc;
  }, {});

  // Count how many jobs were retried
  const retriedJobCount = Object.values(jobsByName).filter(jobGroup => jobGroup.length > 1).length;

  return {
    hasRetries: retriedJobCount > 0,
    retriedJobCount
  };
};

const emptyDetails = {
  testReportSummary: { total: { failed: 0 } },
  hasRetries: false,
  retriedJobCount: 0
};
const getPipelineDetails = async (pipeline, pipelineIid) => {
  let pipelineData;
  try {
    const data = await request({
      url: gitlabGraphqlUrl,
      document: pipelineEnrichmentQuery,
      variables: {
        projectPath: pipeline.projectPath,
        iid: String(pipelineIid)
      },
      requestHeaders: gitlabApiRequestHeaders.headers
    });
    pipelineData = data?.project?.pipeline;
  } catch (error) {
    console.error(`(${pipeline.name}): GraphQL query failed for pipeline ${pipelineIid}:`, error);
    return emptyDetails;
  }
  if (!pipelineData) {
    console.warn(`Failed to fetch details for pipeline ${pipelineIid}`);
    return emptyDetails;
  }
  const retryInfo = calculateRetryInfo(pipelineData.jobs?.nodes || []);
  return {
    testReportSummary: pipelineData.testReportSummary || {},
    hasRetries: retryInfo.hasRetries,
    retriedJobCount: retryInfo.retriedJobCount
  };
};

const getNightlies = async (accu, options = {}, pipeline) => {
  if (!process.env.GITLAB_TOKEN) {
    return [];
  }
  const { page, limit, cutoffDate, totalPages } = options;
  const url = [gitlabProjectPipelineBaseUrl, encodeURIComponent(pipeline.projectPath), 'pipeline_schedules', pipeline.pipelineScheduleId, 'pipelines'].join(
    '/'
  );
  const response = await fetch(`${url}?sort=desc&per_page=${gitlabPaginationLimit}&page=${page}`, gitlabApiRequestHeaders);
  const result = await response.json();
  console.log(`(${pipeline.name}): gotten ${result.length} pipelines of ${limit}`);
  const pipelinesFiltered = result.filter(obj => new Date(obj.created_at).setHours(0, 0, 0, 0) >= cutoffDate);
  const pipelines = [...accu, ...pipelinesFiltered];
  if (page + 1 <= totalPages && pipelines.length < limit) {
    return getNightlies(pipelines, { page: Math.min(totalPages, page + 1), limit, cutoffDate, totalPages }, pipeline);
  }
  return pipelines.slice(0, limit);
};

export const getLatestNightlies = async (cutoffDate, limit = 1, pipeline) => {
  cutoffDate.setHours(0, 0, 0, 0);
  // Ideally, we would order by started date (desc) GitLab API does not support this, so the workaround is to paginate
  // until we collect pipelines, filter by `cutoffDate` and recurse backwards until we have reached `limit` filtered nightlies
  const canaryResponse = await fetch(
    `${gitlabProjectPipelineBaseUrl}/${encodeURIComponent(pipeline.projectPath)}/pipeline_schedules/${pipeline.pipelineScheduleId}/pipelines?per_page=1`,
    gitlabApiRequestHeaders
  );
  const totalPipelines = await canaryResponse.headers.get('x-total');
  console.log(`(${pipeline.name}): will at most go through ${totalPipelines} pipelines`);
  const pipelines = await getNightlies([], { cutoffDate, limit, page: 1, totalPages: Math.ceil(totalPipelines / gitlabPaginationLimit) }, pipeline);

  // Now get the test report summary of each pipeline and construct the final objects to return
  return Promise.all(
    pipelines.map(async obj => {
      const details = await getPipelineDetails(pipeline, obj.iid);

      // Shift 12 hours into the future to show schedules from the previous
      // evening and early morning as the same day. Use a new attribute
      // shiftedDate to still keep the real startedAt for correctness when
      // showing the details of each pipeline.
      const shiftedDate = dayjs(obj.created_at).add(12, 'hours').toISOString();

      return {
        path: obj.web_url.replace(/^https:\/\/gitlab.com/, ''),
        status: obj.status.toUpperCase(),
        startedAt: obj.created_at,
        testReportSummary: details.testReportSummary,
        hasRetries: details.hasRetries,
        retriedJobCount: details.retriedJobCount,
        shiftedDate
      };
    })
  );
};
const limit = 50;

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
      const matchingRun = pipeline.data.find(run => dayjs(run.shiftedDate).isSame(currentDay, 'day'));
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
