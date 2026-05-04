import { Stack } from '@mui/material';

const ResultsMetadata = ({ metadata }) => (
  <Stack style={{ maxWidth: 200 }} sx={{ marginTop: 2, marginBottom: 2 }}>
    {Object.entries(metadata).map(([key, value], index) => (
      <Stack direction="row" key={index} sx={{ justifyContent: 'space-between' }}>
        <b>{key}</b>
        <div>{value}</div>
      </Stack>
    ))}
  </Stack>
);

export default ResultsMetadata;
