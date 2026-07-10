module.exports = {
  output: 'export',
  reactStrictMode: true,
  transpilePackages: ['@mui/x-data-grid'],
  staticPageGenerationTimeout: 180 // 3 minutes, 60 seconds have proved to cause timeouts frequently
};
