import React, { useState } from 'react';

import { DataGrid, GridToolbar } from '@mui/x-data-grid';

import { Typography } from '@mui/material';

import Link from '../components/link';

const ResultCell = ({ result }) => {
  const color = result === 'success' || result == 'passed' ? 'success.light' : 'error';

  return (
    <Typography variant="h8" color={color}>
      {' '}
      {result}{' '}
    </Typography>
  );
};

const tableColumnDefinitions = {
  projects: [
    {
      field: 'id',
      headerName: 'GitLab Pipeline ID',
      minWidth: 100
    },
    {
      field: 'name',
      headerName: 'Name',
      minWidth: 250,
      renderCell: params => <Link href={`/projects/${params.row.id}/builds`}> {params.row.name} </Link>
    }
  ],
  builds: [
    {
      field: 'id',
      headerName: 'Job ID',
      renderCell: params => {
        const projectid = params.row.project_id;
        return <Link href={`https://gitlab.com/Northern.tech/Mender/mender-qa/-/projects/${projectid}/jobs/${params.row.id}`}> {params.row.id} </Link>;
      }
    },
    {
      field: 'project_id',
      headerName: 'Project ID'
    },
    {
      field: 'name',
      headerName: 'Name',
      renderCell: params => {
        const projectid = params.row.project_id;
        return <Link href={`/projects/${projectid}/builds/${params.row.id}`}> {params.row.name} </Link>;
      },
      minWidth: 200
    },
    {
      field: 'status',
      headerName: 'Result',
      renderCell: params => {
        return <ResultCell result={params.row.status} />;
      }
    }
  ],
  results: [
    {
      field: 'id',
      headerName: 'ID',
      minWidth: 150,
      sortable: false,
      editable: false
    },
    {
      field: 'build_id',
      headerName: 'Build ID',
      minWidth: 150,
      sortable: false,
      filterable: false,
      renderCell: params => <Link href={`/projects/${params.row.id}/builds/${params.row.jobId}/result`}> {params.row.jobId} </Link>,
      editable: false
    },
    {
      field: 'result',
      headerName: 'Result',
      minWidth: 110,
      renderCell: params => {
        return <ResultCell result={params.row.result} />;
      },
      sortable: true
    },
    {
      field: 'result_message',
      headerName: 'Result Message',
      sortable: false,
      minWidth: 110,
      flex: 1,
      renderCell: params => (
        <Link href={{ pathname: `/projects/${params.row.id}/builds/result`, query: { codeString: params.row.test_name } }}> {params.row.result_message} </Link>
      )
    },
    {
      field: 'test_name',
      headerName: 'Test Name',
      description: 'This column has a value getter and is not sortable.',
      sortable: true,
      minMinWidth: 260,
      flex: 1,
      renderCell: params => (
        <Link href={`/projects/${params.row.project_id}/tests/history?name=${encodeURIComponent(params.row.test_name)}&count=10`}>
          {' '}
          {params.row.test_name}{' '}
        </Link>
      )
    },
    {
      field: 'tags',
      headerName: 'Tags',
      sortable: true,
      renderCell: params => {
        if (params.row.tags && params.row.tags.nightly) {
          return (
            <div
              style={{
                color: 'orange'
              }}
            >
              {' '}
              nightly{' '}
            </div>
          );
        }
        return '';
      },
      minWidth: 100
    },
    {
      field: 'timestamp',
      headerName: 'TimeStamp',
      sortable: true,
      valueGetter: params => {
        const date = new Date(params.row.timestamp * 1000);
        return date.toLocaleDateString();
      },
      minWidth: 200
    }
  ]
};

const ResourceTable = ({ resources, type }) => {
  const rows = resources;
  const columns = tableColumnDefinitions[type];

  let initialState = {};
  if (type == 'results') {
    initialState = {
      sorting: {
        sortModel: [
          {
            field: 'result',
            sort: 'asc'
          }
        ]
      }
    };
  }

  return (
    <DataGrid
      autoHeight
      showQuickFilter
      initialState={initialState}
      rows={rows}
      columns={columns}
      pageSize={10}
      rowsPerPageOptions={[10]}
      disableSelectionOnClick
      disableColumnSelector
      disableDensitySelector
      loading={resources.length == 0}
      components={{
        Toolbar: GridToolbar
      }}
    />
  );
};

export default ResourceTable;
