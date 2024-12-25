const buildStatusColorMap = {
  CANCELED: 'inherit',
  FAILED: 'error',
  RUNNING: 'warning',
  SUCCESS: 'success',
  default: 'secondary' // WTF is going on colour! - we can't use a color variant string here (like warning.dark), as a color prop
};

export const buildStatusColor = status => buildStatusColorMap[status] || buildStatusColorMap.default;
export const openNightlyClick = item => window.open(`https://gitlab.com${item.path}`, '_newtab');
