import { useEffect, useState } from 'react';

import { Typography } from '@mui/material';

import { useRouter } from 'next/router';

import ResourceTable from '../../../../src/resource-table';

const LastFailedView = () => {
  const router = useRouter();
  const { count = 10, name, projectid } = router.query;

  /**
   * This will populate all failed tests and how many times each failed
   * in the last <count> executions for a specific build.
   */
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!(projectid && name)) {
      return;
    }
    fetch(`/api/projects/${projectid}/status/failed/count/${count}?build_name=${name}`)
      .then(response => response.json())
      .then(result => setResults(result));
  }, [count, name, projectid]);

  return (
    <>
      <Typography variant="h4">Last Failed</Typography>
      <Typography variant="h6">Failed results</Typography>
      <ResourceTable resources={results} type="results" />
    </>
  );
};

export default LastFailedView;
