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
  const query = gql`
    query getPipeline($date: Time, $limit: Int) {
      project(fullPath: "Northern.tech/Mender/mender-qa") {
        pipelines(source: "schedule", ref: "master", first: $limit, updatedAfter: $date) {
          nodes {
            path
            status
            startedAt
            testReportSummary {
              total {
                count
                error
                failed
                skipped
                success
                time
              }
            }
          }
        }
      }
    }
  `;

  const nightlies = await request({
    url: 'https://gitlab.com/api/graphql',
    variables: { date: cutoffDate.toISOString().split('T')[0], limit },
    document: query,
    requestHeaders: { Authorization: `Bearer ${process.env.GITLAB_TOKEN}` }
  });
  const {
    project: {
      pipelines: { nodes }
    }
  } = nightlies;
  return nodes;
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
