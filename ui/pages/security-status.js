import fs from 'fs/promises';
import path from 'path';
import { GetObjectCommand, ListObjectsCommand, S3Client } from '@aws-sdk/client-s3';

import React, { memo, useRef, useState } from 'react';

import { Box, FormControlLabel, Paper, Popper, Switch, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

import Link from '../components/link';

const isOverflown = element => element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth;

const GridCellExpand = memo(function GridCellExpand({ width, value }) {
  const wrapper = useRef(null);
  const cellDiv = useRef(null);
  const cellValue = useRef(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [showFullCell, setShowFullCell] = useState(false);
  const [showPopper, setShowPopper] = useState(false);

  const handleMouseEnter = () => {
    const isCurrentlyOverflown = isOverflown(cellValue.current);
    setShowPopper(isCurrentlyOverflown);
    setAnchorEl(cellDiv.current);
    setShowFullCell(true);
  };

  const handleMouseLeave = () => setShowFullCell(false);

  return (
    <Box
      ref={wrapper}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      sx={{
        alignItems: 'center',
        lineHeight: 24,
        width: 1,
        height: 1,
        position: 'relative',
        display: 'flex'
      }}
    >
      <Box
        ref={cellDiv}
        sx={{
          height: 1,
          width,
          display: 'block',
          position: 'absolute',
          top: 0
        }}
      />
      <Box ref={cellValue} sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {value}
      </Box>
      {showPopper && (
        <Popper open={showFullCell && anchorEl !== null} anchorEl={anchorEl} style={{ maxWidth: 400, width: 'fit-content' }}>
          <Paper elevation={1} style={{ minHeight: wrapper.current.offsetHeight - 3 }}>
            <Typography variant="body2" style={{ padding: 8 }}>
              {value}
            </Typography>
          </Paper>
        </Popper>
      )}
    </Box>
  );
});

const renderCellExpand = params => <GridCellExpand value={params.value || ''} width={params.colDef.computedWidth} />;

const columns = [
  { field: 'image', headerName: 'Image Name', flex: 1, renderCell: renderCellExpand },
  { field: 'PkgName', headerName: 'Library', flex: 1 },
  { field: 'VulnerabilityID', headerName: 'Vulnerability ID', flex: 1 },
  { field: 'Severity', headerName: 'Severity', flex: 0.5 },
  { field: 'InstalledVersion', headerName: 'Installed Version', flex: 1 },
  { field: 'PublishedDate', headerName: 'Published Date', type: 'dateTime', flex: 1 },
  { field: 'Title', headerName: 'Title', flex: 1, renderCell: renderCellExpand },
  { field: 'logfile', headerName: 'Report Logs', flex: 0.5, sortable: false, renderCell: params => <Link href={params.row.logfile}>SEE LOGS</Link> }
];

const SecurityStatus = ({ results }) => {
  const [isFiltered, setIsFiltered] = useState(false);
  const handleChange = () => setIsFiltered(current => !current);
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography marginBottom={2} variant="h4">
          Security Status
        </Typography>
        <FormControlLabel control={<Switch checked={isFiltered} onChange={handleChange} color="primary" />} label="Filter images" labelPlacement="start" />
      </div>
      <div style={{ height: '70vh', width: '100%' }}>
        <DataGrid
          filterModel={{ items: isFiltered ? [{ columnField: 'image', operatorValue: 'contains', value: 'mendersoftware' }] : [] }}
          rows={results}
          columns={columns}
          pageSize={50}
          rowsPerPageOptions={[50]}
          disableSelectionOnClick
        />
      </div>
    </>
  );
};

const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'hm-staging-security-scans';
const REGION = process.env.AWS_S3_REGION || 'eu-central-1';
const bucketParams = { Bucket: AWS_S3_BUCKET_NAME };

// helper function to convert a ReadableStream to a string.
const streamToString = stream =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });

const listObjects = async s3Client => {
  try {
    const data = await s3Client.send(new ListObjectsCommand(bucketParams));
    return data.Contents;
  } catch (err) {
    console.log('Error', err);
  }
};

const transformFileContents = (filename, content) => {
  const name = filename.substring(filename.indexOf('/') + 1);
  const start = content.indexOf('{');
  const logContent = content.substring(0, start);
  const jsonContent = content.substring(start);
  let parsedJson;
  try {
    parsedJson = JSON.parse(jsonContent);
  } catch (error) {
    console.log(filename, ':', error);
  }
  return { image: name, jsonContent: parsedJson, logContent };
};

const getFile = async (s3Client, filename) => {
  try {
    // console.log('really getting', filename);
    // Get the object} from the Amazon S3 bucket. It is returned as a ReadableStream.

    const data = await s3Client.send(new GetObjectCommand({ ...bucketParams, Key: filename }));
    // return data; // For unit tests.
    // Convert the ReadableStream to a string.
    // console.log('morphing data', filename);
    const bodyContents = await streamToString(data.Body);
    return transformFileContents(filename, bodyContents);
  } catch (err) {
    console.log('Error', err);
  }
};

const persistLogData = async fileContents =>
  fileContents.reduce(async (accu, item) => {
    // console.log('checking', item.image);
    if (!item.jsonContent?.Results) {
      return accu;
    }
    let filePath = item.image.split('/');
    const fileName = filePath.pop();
    const targetFolder = path.join('public', 'logs', ...filePath);
    try {
      await fs.access(targetFolder);
    } catch (error) {
      console.log('oh noes', error);
      await fs.mkdir(targetFolder, { recursive: true });
    }
    console.log('writing', fileName);
    const logfile = path.join(targetFolder, `${fileName}.log`);
    await fs.writeFile(logfile, item.logContent);
    const vulnerabilities = item.jsonContent.Results.reduce((vulns, { Vulnerabilities = [] }) => [...vulns, ...Vulnerabilities], []);
    (await accu).push({ image: item.image, logfile: `/logs/${item.image}.log`, vulnerabilities });
    return accu;
  }, Promise.resolve([]));

export async function getStaticProps() {
  if (!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)) {
    return { props: { results: [] } };
  }

  const s3Client = new S3Client({ region: REGION });
  console.log('listing');
  const fileList = await listObjects(s3Client);
  console.log('getting');
  const fileContents = await Promise.all(fileList.map(({ Key }) => getFile(s3Client, Key)));

  console.log('persisting');
  const results = await persistLogData(fileContents);

  const mappedResults = results.reduce((accu, result) => {
    const { image, logfile, vulnerabilities = [] } = result;
    if (!vulnerabilities.length) {
      return accu;
    }
    accu.push(
      ...vulnerabilities.map((vulnerability, index) => {
        const { VulnerabilityID, PkgName, Severity, InstalledVersion, PublishedDate = null, Title = null } = vulnerability;
        return {
          id: `${image}-${VulnerabilityID}-${index}`,
          image,
          logfile,
          VulnerabilityID,
          PkgName,
          Severity,
          InstalledVersion,
          PublishedDate,
          Title
        };
      })
    );
    return accu;
  }, []);

  return {
    props: {
      results: mappedResults
    }
  };
}

export default SecurityStatus;
