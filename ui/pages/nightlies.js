import React from 'react';

import { request, gql } from 'graphql-request';

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

export const getLatestNightlies = async (cutoffDate, limit = 1) => {
  const gitlabApiMenderQaProject = `https://gitlab.com/api/v4/projects/Northern.tech%2FMender%2Fmender-qa`;
  const gitlabApiRequestHeaders = {
    headers: {
      Authorization: `Bearer ${process.env.GITLAB_TOKEN}`
    }
  };

  // Ideally, we would order by started date (desc) and then just get the first `limit` pipelines.
  // GitLab API does not support this so the workaround is to paginate at `limit` page size, get
  // the last two pages, and then filter out with `cutoffDate`,
  const perPage = limit;
  const canaryResponse = await fetch(`${gitlabApiMenderQaProject}/pipeline_schedules/30585/pipelines?per_page=${perPage}`, gitlabApiRequestHeaders);
  const totalPages = await canaryResponse.headers.get('x-total-pages');
  const pipelines = await Promise.all(
    [totalPages - 1, totalPages].map(page =>
      fetch(`${gitlabApiMenderQaProject}/pipeline_schedules/30585/pipelines?per_page=${perPage}&page=${page}`, gitlabApiRequestHeaders)
        .then(res => res.json())
        .then(data => {
          return data;
        })
    )
  );
  const pipelinesFiltered = pipelines
    .flat()
    .reverse()
    .filter(obj => new Date(obj.created_at).setHours(0, 0, 0, 0) >= cutoffDate.setHours(0, 0, 0, 0));

  // Now get the test report summary of each pipeline and construct the final objects to return
  return Promise.all(
    pipelinesFiltered.map(obj =>
      fetch(`${gitlabApiMenderQaProject}/pipelines/${obj.id}/test_report_summary`, gitlabApiRequestHeaders)
        .then(res => res.json())
        .then(data => {
          return {
            path: obj.web_url.replace(/^https:\/\/gitlab.com/, ''),
            status: obj.status.toUpperCase(),
            startedAt: obj.created_at,
            testReportSummary: { total: data['total'] }
          };
        })
    )
  ).then(objs => {
    return objs;
  });
};

export async function getStaticProps() {
  const today = new Date();
  today.setDate(today.getDate() - 99);
  const latestNightlies = await getLatestNightlies(today, 100);
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
