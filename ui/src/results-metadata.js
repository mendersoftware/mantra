import { Stack } from '@mui/material';

const ResultsMetadata = ({ metadata }) => (
  <Stack marginTop={2} marginBottom={2} style={{ maxWidth: 200 }}>
    {Object.entries(metadata).map(([key, value], index) => (
      <Stack direction="row" key={index} justifyContent="space-between">
        <b>{key}</b>
        <div>{value}</div>
      </Stack>
    ))}
  </Stack>
);

export default ResultsMetadata;
