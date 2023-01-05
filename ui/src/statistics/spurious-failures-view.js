import React, { useState, useEffect } from 'react';

import { Box, TextField, Typography } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import { DataGrid } from '@mui/x-data-grid';

import dayjs from 'dayjs';

const columns = [
  {
    field: 'test_name',
    headerName: 'Test Name',
    flex: 1,
    renderCell: params => (
      <Link href={`/projects/${params.row.project_id}/tests/history?name=${encodeURIComponent(params.row.test_name)}&count=10`}> {params.row.test_name} </Link>
    )
  },
  { field: 'count', headerName: '# Failures', flex: 1 }
];

const minInputDate = new Date(2020, 1, 1);

const SpuriousFailuresView = props => {
  const [sinceDate, setSinceDate] = useState(dayjs().subtract(7, 'day'));

  const [results, setResults] = useState([]);

  const [loading, setLoading] = useState(true);

  const fetchStatistics = params => {
    fetch('/api/tests/statistics/spurious-failures/' + '?' + new URLSearchParams(params))
      .then(response => response.json())
      .then(result => {
        setResults(result);
      })
      .finally(() => setLoading(false));
  };

  const handleChange = date => {
    setSinceDate(date);
  };

  useEffect(() => {
    setLoading(true);
    fetchStatistics({ since_time: sinceDate.unix(), type: 'nightly' });
  }, [sinceDate]);

  return (
    <>
      <Typography variant="h4">Nightly Spurious Failures</Typography>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DesktopDatePicker
          label="Since Date"
          value={sinceDate}
          onChange={handleChange}
          maxDate={new Date()}
          minDate={minInputDate}
          renderInput={params => <TextField {...params} />}
        />
        <Box sx={{ height: 650, width: '100%' }}>
          <DataGrid
            getRowId={row => row.test_name}
            rows={results}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[10]}
            disableSelectionOnClick
            loading={loading}
          />
        </Box>
      </LocalizationProvider>
    </>
  );
};

export default SpuriousFailuresView;
