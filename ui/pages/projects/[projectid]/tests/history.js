import { useEffect, useState } from 'react';

import { Typography } from '@mui/material';

import { useRouter } from 'next/router';

import ResourceTable from '../../../../src/resource-table';

const HistoryView = () => {
  const router = useRouter();
  const { count = 10, name, projectid } = router.query;

  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!(projectid && name)) {
      return;
    }
    fetch(`/api/projects/${projectid}/test_name/${name}/count/${count}`)
      .then(response => response.json())
      .then(result => setResults(result));
  }, [count, name, projectid]);

  return (
    <>
      <Typography variant="h4">Test History</Typography>
      <Typography variant="h6">Test Case {name}</Typography>
      <ResourceTable resources={results} type="results" />
    </>
  );
};

export default HistoryView;
