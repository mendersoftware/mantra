import React from 'react';
import { Grid, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { Circle } from '@mui/icons-material';
import { buildStatusColor } from '../constants';
import { makeStyles } from 'tss-react/mui';

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
export const PipelineListView = props => {
  const { classes } = useStyles();
  const { nightlies, title } = props;
  return (
    <>
      <h4>{title}</h4>
      <Stack className={classes.builds}>
        {nightlies &&
          nightlies.map(monthlyNightlies => {
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
                        <a href={`https://gitlab.com${item.path}`} target="_blank">
                          <IconButton color={buildStatusColor(item.status)} edge="start" size="small">
                            <Circle color={buildStatusColor(item.status)} />
                          </IconButton>
                        </a>
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
