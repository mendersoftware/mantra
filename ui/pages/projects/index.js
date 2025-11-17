import { useEffect, useState } from 'react';

import { Typography } from '@mui/material';

import ResourceTable from '../../src/resource-table';

const ProjectsView = () => {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    fetch('/api/projects')
      .then(response => response.json())
      .then(result => setProjects(result));
  }, []);

  return (
    <>
      <Typography marginBottom={2} variant="h4">
        Projects
      </Typography>
      <ResourceTable resources={projects} type="projects" />
    </>
  );
};

export default ProjectsView;
