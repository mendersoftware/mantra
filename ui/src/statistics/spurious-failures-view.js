import React, { useState, useEffect } from 'react';

import { Box, TextField, Typography, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import { DataGrid } from '@mui/x-data-grid';

import dayjs from 'dayjs';

const minInputDate = dayjs(new Date(2020, 1, 1));

const SpuriousFailuresView = props => {
  const [sinceDate, setSinceDate] = useState(dayjs().subtract(7, 'day'));

  const [results, setResults] = useState([]);

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [nightliesOnly, setNightliesOnly] = useState(true); // Toggle for nightlies

  const columns = [
    { field: 'test_name', headerName: 'Test Name', flex: 1 },
    { field: 'count', headerName: '# Failures', flex: 1 },
    {
      field: 'project_id',
      headerName: 'Project',
      flex: 1,
      renderCell: params => {
        const project = projects.find(proj => proj.id === params.row.project_id);
        return project ? project.name : 'Unknown';
      }
    }
  ];

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

  // Fetch list of projects for the dropdown
  useEffect(() => {
    fetch('/api/projects')
      .then(response => response.json())
      .then(data => setProjects(data));
  }, []);

  // Handle project change
  const handleProjectChange = event => {
    setSelectedProject(event.target.value);
  };

  // Handle nightlies toggle change
  const handleNightliesToggle = event => {
    setNightliesOnly(event.target.checked);
  };

  useEffect(() => {
    setLoading(true);
    // Ensure valid query parameters for project and nightlies toggle
    const params = {
      since_time: sinceDate.unix(),
      type: nightliesOnly ? 'nightly' : '', // If nightliesOnly is true, filter for nightlies; otherwise, include all tests
      project: selectedProject || '' // Default to empty string if project is not selected
    };

    fetchStatistics(params);
  }, [sinceDate, selectedProject, nightliesOnly]);

  return (
    <>
      <Typography variant="h4">Spurious Failures</Typography>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel id="project-label">Project</InputLabel>
          <Select labelId="project-label" value={selectedProject} label="Project" onChange={handleProjectChange}>
            <MenuItem value="">
              <em>All</em>
            </MenuItem>
            {projects.map(proj => (
              <MenuItem key={proj.id} value={proj.id}>
                {proj.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControlLabel control={<Checkbox checked={nightliesOnly} onChange={handleNightliesToggle} />} label="Nightlies Only" />
      </Box>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DesktopDatePicker
          label="Since Date"
          value={sinceDate}
          onChange={handleChange}
          maxDate={dayjs()}
          minDate={minInputDate}
          renderInput={params => <TextField {...params} />}
        />
        <Box sx={{ height: 650, width: '100%' }}>
          <DataGrid
            getRowId={row => row.test_name}
            rows={results}
            columns={columns}
            pageSize={10}
            pageSizeOptions={[10]}
            disableRowSelectionOnClick
            loading={loading}
          />
        </Box>
      </LocalizationProvider>
    </>
  );
};

export default SpuriousFailuresView;
