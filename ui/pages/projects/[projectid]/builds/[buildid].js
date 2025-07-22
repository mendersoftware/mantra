import React, { useCallback, useEffect, useState } from 'react';

import { useRouter } from 'next/router';

import { Button, Stack, Typography } from '@mui/material';
import { ArrowBackIosNew as ArrowBackIcon, ArrowForwardIos as ArrowForwardIcon } from '@mui/icons-material';

import ResourceTable from '../../../../src/resource-table';
import ResultsMetadata from '../../../../src/results-metadata';

const OFFSET_DELTA = 25;

const ResultsView = () => {
  const [results, setResults] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [offset, setOffset] = useState(0);

  const router = useRouter();
  const { buildid, projectid } = router.query;

  const getResults = useCallback(
    offset =>
      fetch(`/api/projects/${projectid}/builds/${buildid}/results?offset=${offset}`)
        .then(response => response.json())
        .then(result => {
          setResults(result.results);
          setMetadata(result.metadata);
          setOffset(offset);
        }),
    [projectid, buildid]
  );

  useEffect(() => {
    if (!(buildid && projectid)) {
      return;
    }
    getResults(offset);
  }, [buildid, getResults, offset, projectid]);

  const offsetIncrease = () => getResults(offset + OFFSET_DELTA);

  const offsetDecrease = () => getResults(Math.max(offset - OFFSET_DELTA, 0));

  const canPageForward = offset + OFFSET_DELTA < metadata['total_results'];
  const canPageBackward = offset - OFFSET_DELTA >= 0;
  const tableSlots = {
    results: {
      false_positive: {
        onChange: params => {
          const resultId = params.row.id;
          const method = params.row.tags.false_positive ? 'DELETE' : 'POST';
          fetch(`/api/results/${resultId}/false-positive`, { method }).then(() => getResults(offset));
        }
      }
    }
  };
  return (
    <>
      <Typography variant="h4">Results</Typography>
      <Typography variant="h6">Summary</Typography>
      <ResultsMetadata metadata={metadata} />
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="h6">All results</Typography>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" disabled={!canPageBackward} startIcon={<ArrowBackIcon />} onClick={offsetDecrease}>
            Previous
          </Button>
          <Button variant="outlined" disabled={!canPageForward} endIcon={<ArrowForwardIcon />} onClick={offsetIncrease}>
            Next
          </Button>
        </Stack>
      </Stack>
      <ResourceTable resources={results} tableSlots={tableSlots} type="results" />
    </>
  );
};

export default ResultsView;
