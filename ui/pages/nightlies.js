import React from 'react';

import { Grid, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { Circle } from '@mui/icons-material';
import { makeStyles } from 'tss-react/mui';

import { buildStatusColor } from './build-status';

const useStyles = makeStyles()(theme => ({
  builds: {
    borderColor: theme.palette.grey[500],
    borderRadius: theme.spacing(0.5),
    borderStyle: 'solid',
    borderWidth: 1,
    marginTop: theme.spacing(2),
    padding: theme.spacing(2)
  }
}));

export const openNightlyClick = item => window.open(`https://gitlab.com${item.path}`, '_newtab');

const Nightlies = ({ nightlies }) => {
  const { classes } = useStyles();
  return (
    <>
      <Typography variant="h4">Nightlies</Typography>
      <Stack className={classes.builds}>
        {nightlies.map(monthlyNightlies => {
          const date = new Date(monthlyNightlies[0].startedAt);
          return (
            <React.Fragment key={date.getMonth()}>
              <Typography variant="h6">{date.toLocaleString('default', { month: 'long' })}</Typography>
              <Grid container direction="row" justifyContent="flex-start" alignItems="flex-start">
                {monthlyNightlies.map(item => (
                  <Stack key={item.path} alignItems="center">
                    <Tooltip
                      arrow
                      title={
                        <>
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
                      <IconButton color={buildStatusColor(item.status)} edge="start" onClick={() => openNightlyClick(item)} size="small">
                        <Circle color={buildStatusColor(item.status)} />
                      </IconButton>
                    </Tooltip>
                    {!!Number(item.testReportSummary.total.failed) && <Typography variant="caption">{item.testReportSummary.total.failed}</Typography>}
                  </Stack>
                ))}
              </Grid>
            </React.Fragment>
          );
        })}
      </Stack>
    </>
  );
};

const gitlabApiMenderQaProject = `https://gitlab.com/api/v4/projects/${encodeURIComponent('Northern.tech/Mender/mender-qa')}`;
const gitlabApiRequestHeaders = { headers: { Authorization: `Bearer ${process.env.GITLAB_TOKEN}` } };
const gitlabPaginationLimit = 100;

const getNightlies = async (accu, options = {}) => {
  if (!process.env.GITLAB_TOKEN) {
    return [];
  }
  const { page, limit, cutoffDate } = options;
  const response = await fetch(
    `${gitlabApiMenderQaProject}/pipeline_schedules/30585/pipelines?per_page=${gitlabPaginationLimit}&page=${page}`,
    gitlabApiRequestHeaders
  );
  const pipelinesFiltered = (await response.json()).filter(obj => new Date(obj.created_at).setHours(0, 0, 0, 0) >= cutoffDate);
  const pipelines = [...accu, ...pipelinesFiltered.reverse()];
  if (page - 1 >= 1 && pipelines.length < limit) {
    return getNightlies(pipelines, { page: Math.max(1, page - 1), limit, cutoffDate });
  }
  return pipelines.slice(0, limit);
};

export const getLatestNightlies = async (cutoffDate, limit = 1) => {
  cutoffDate.setHours(0, 0, 0, 0);
  // Ideally, we would order by started date (desc) GitLab API does not support this, so the workaround is to paginate
  // until we collect pipelines, filter by `cutoffDate` and recurse backwards until we have reached `limit` filtered nightlies
  const canaryResponse = await fetch(
    `${gitlabApiMenderQaProject}/pipeline_schedules/30585/pipelines?per_page=${gitlabPaginationLimit}`,
    gitlabApiRequestHeaders
  );
  const totalPages = await canaryResponse.headers.get('x-total-pages');
  const pipelines = await getNightlies([], { cutoffDate, limit, page: totalPages });

  // Now get the test report summary of each pipeline and construct the final objects to return
  return Promise.all(
    pipelines.map(obj =>
      fetch(`${gitlabApiMenderQaProject}/pipelines/${obj.id}/test_report_summary`, gitlabApiRequestHeaders)
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

export async function getStaticProps() {
  const limit = 150;
  const today = new Date();
  // deduct today when setting the cutoff date for the retrieved pipelines
  today.setDate(today.getDate() - (limit - 1));
  const latestNightlies = await getLatestNightlies(today, limit);
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
  return {
    props: {
      nightlies: Object.values(items)
    }
  };
}

export default Nightlies;
