import { Circle, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary, Stack, Typography } from '@mui/material';

import { existsSync } from 'fs';
import fs from 'fs/promises';
import { gql, request } from 'graphql-request';

import Link from '../components/link';
import { buildStatusColor } from '../src/constants';

const areas = {
  backend: 'backend',
  client: 'client',
  docs: 'docs',
  saas: 'saas',
  qa: 'qa'
};

const repos = [
  { repo: 'app-update-module', staging: false, isExecutable: false, isProduct: true, area: areas.client },
  { repo: 'grub-mender-grubenv', staging: false, isExecutable: false, isProduct: true, area: areas.client },
  { repo: 'integration-test-runner', staging: false, isExecutable: false, isProduct: false, area: areas.qa },
  { repo: 'integration', staging: true, isExecutable: false, isProduct: false, area: areas.qa },
  { repo: 'mender-api-docs', staging: false, isExecutable: false, isProduct: false, area: areas.docs },
  { repo: 'mender-api-gateway-docker', staging: false, isExecutable: false, isProduct: false, area: areas.backend },
  { repo: 'mender-artifact', staging: true, isExecutable: true, isProduct: true, area: areas.client },
  { repo: 'mender-binary-delta', staging: true, isExecutable: true, isProduct: true, area: areas.client, supportedBranches: ['1.5.x'] },
  { repo: 'mender-cli', staging: true, isExecutable: true, isProduct: true, area: areas.backend },
  { repo: 'mender-configure-module', staging: true, isExecutable: true, isProduct: true, area: areas.client, supportedBranches: ['1.1.x'] },
  { repo: 'mender-connect', staging: true, isExecutable: true, isProduct: true, area: areas.client, supportedBranches: ['2.3.x'] },
  { repo: 'mender-convert', staging: true, isExecutable: true, isProduct: true, area: areas.client },
  { repo: 'mender-demo-artifact', staging: false, isExecutable: false, isProduct: false, area: areas.backend },
  { repo: 'mender-dist-packages', staging: false, isExecutable: false, isProduct: false, area: areas.client },
  { repo: 'mender-docs-changelog', staging: false, isExecutable: false, isProduct: false, area: areas.docs },
  { repo: 'mender-docs-site', staging: false, isExecutable: false, isProduct: false, area: areas.docs },
  { repo: 'mender-docs', branches: ['master', 'hosted'], staging: false, isExecutable: false, isProduct: false, area: areas.docs },
  { repo: 'mender-flash', staging: true, isExecutable: true, isProduct: true, area: areas.client, supportedBranches: ['1.0.x'] },
  { repo: 'mender-gateway', staging: true, isExecutable: true, isProduct: true, area: areas.client, supportedBranches: ['2.0.x'] },
  { repo: 'mender-helm', staging: false, isExecutable: false, isProduct: false, area: areas.saas, supportedBranches: ['5.x'] },
  { repo: 'mender-image-tests', staging: false, isExecutable: false, isProduct: false, area: areas.client },
  { repo: 'mender-mcu', branches: ['main'], staging: false, isExecutable: true, isProduct: true, area: areas.client },
  { repo: 'mender-orchestrator', staging: false, isExecutable: true, isProduct: true, area: areas.client },
  {
    repo: 'mender-server-enterprise',
    branches: ['main'],
    staging: true,
    isExecutable: false,
    isProduct: true,
    area: areas.backend,
    supportedBranches: ['4.0.x']
  },
  { repo: 'mender-server', branches: ['main'], staging: false, isExecutable: false, isProduct: true, area: areas.backend, supportedBranches: ['4.0.x'] },
  { repo: 'mender-setup', staging: false, isExecutable: false, isProduct: true, area: areas.client },
  { repo: 'mender-snapshot', staging: false, isExecutable: false, isProduct: true, area: areas.client },
  { repo: 'mender-stress-test-client', staging: false, isExecutable: false, isProduct: false, area: areas.qa },
  { repo: 'mender-test-containers', staging: false, isExecutable: false, isProduct: false, area: areas.qa },
  { repo: 'mender', staging: true, isExecutable: true, isProduct: true, area: areas.client, supportedBranches: ['5.0.x'] },
  { repo: 'mendertesting', staging: false, isExecutable: false, isProduct: false, area: areas.qa },
  { repo: 'meta-mender', staging: true, isExecutable: false, isProduct: true, area: areas.client, supportedBranches: ['kirkstone', 'scarthgap'] },
  { repo: 'monitor-client', staging: false, isExecutable: true, isProduct: true, area: areas.client, supportedBranches: ['1.4.x'] },
  { repo: 'openssl', staging: false, isExecutable: false, isProduct: false, area: areas.client },
  { repo: 'progressbar', staging: false, isExecutable: false, isProduct: false, area: areas.client },
  { repo: 'saas-tools', staging: false, isExecutable: false, isProduct: false, area: areas.saas },
  { repo: 'saas', organization: 'MenderSaas', staging: false, isExecutable: false, isProduct: false, area: areas.saas },
  { repo: 'sre-tools', staging: false, isExecutable: false, isProduct: false, area: areas.saas }
];

const mainBranches = ['main', 'master'];
const defaultBranches = ['master'];

const minWidth = { style: { minWidth: 110 } };
const CoverageDisplay = ({ coverage }) =>
  !!coverage && coverage !== 'unknown' ? (
    <Typography color="text.disabled" {...minWidth}>
      Coverage: {coverage}%
    </Typography>
  ) : (
    <div {...minWidth} />
  );

const RepoStatusItem = ({ repo, organization = 'Mender', branch = 'master', coverage, buildStatus, dependabotPendings }) => (
  <Stack direction="row" justifyContent="space-between">
    <Stack direction="row" alignContent="center" spacing={2}>
      <Link href={`https://gitlab.com/Northern.tech/${organization}/${repo}/-/pipelines?ref=${branch}`}>
        {mainBranches.includes(branch) ? (
          <Circle color={buildStatusColor(buildStatus.status)} />
        ) : (
          <img alt={`${repo} ${branch} build-status`} src={`https://gitlab.com/Northern.tech/${organization}/${repo}/badges/${branch}/pipeline.svg`} />
        )}
      </Link>
      <Link href={`https://github.com/mendersoftware/${repo}/tree/${branch}`} target="_blank">
        <Typography variant="subtitle2">
          {repo} {branch !== 'master' ? branch : ''}
        </Typography>
      </Link>
    </Stack>
    <Stack direction="row" alignItems="center" spacing={2.5}>
      {!!dependabotPendings && (
        <Link
          href={`https://github.com/mendersoftware/${repo}/pulls`}
          target="_blank"
          rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', columnGap: 10 }}
        >
          <img alt="dependabot" src="https://avatars.githubusercontent.com/u/27347476?s=20" />
          <div>({dependabotPendings})</div>
        </Link>
      )}
      <CoverageDisplay coverage={coverage} />
      <div style={{ width: '1em' }} />
    </Stack>
  </Stack>
);

const BuildStatus = ({ componentsByArea, supported, untracked }) => {
  const { total, ...components } = componentsByArea;
  return (
    <>
      <Stack direction="row" justifyContent="space-between" marginBottom={2}>
        <Typography variant="h4">Build Status</Typography>
        <Stack direction="row" alignItems="center" spacing={2}>
          <CoverageDisplay coverage={total.coverage} />
        </Stack>
      </Stack>

      {Object.entries(components).map(([area, component]) => (
        <Accordion key={area} defaultExpanded disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} id={area}>
            <Stack direction="row" justifyContent="space-between" flexGrow={1}>
              {area}
              <CoverageDisplay coverage={component.coverage} />
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            {component.repos.map(({ repo, branches = defaultBranches, buildStatus, coverage, dependabotPendings, organization }) =>
              branches.map(branch => (
                <RepoStatusItem
                  key={`${repo}-${branch}`}
                  repo={repo}
                  branch={branch}
                  buildStatus={buildStatus}
                  coverage={coverage}
                  dependabotPendings={dependabotPendings}
                  organization={organization}
                />
              ))
            )}
          </AccordionDetails>
        </Accordion>
      ))}

      <Accordion defaultExpanded disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} id="supported-components">
          <Typography variant="h6">Supported Component Versions</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {supported.repos.reduce((accu, { repo, supportedBranches = [], coverage, buildStatus, organization }) => {
            supportedBranches.forEach(branch =>
              accu.push(
                <RepoStatusItem
                  key={`${repo}-${branch}`}
                  repo={repo}
                  branch={branch}
                  buildStatus={buildStatus}
                  coverage={coverage}
                  organization={organization}
                />
              )
            );
            return accu;
          }, [])}
        </AccordionDetails>
      </Accordion>
      <Accordion disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} id="untracked-header">
          <Typography variant="h6">Other repos</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {untracked.map(({ repo, dependabotPendings }) => (
            <RepoStatusItem key={repo} repo={repo} dependabotPendings={dependabotPendings} />
          ))}
        </AccordionDetails>
      </Accordion>
    </>
  );
};

const areaTargetsMap = [
  { name: 'staging', target: 'staging' },
  { name: 'isExecutable', target: 'executable' },
  { name: 'isProduct', target: 'product' },
  { name: 'supportedBranches', target: 'supported' }
];

const transformReposIntoAreas = withDependabot =>
  repos.reduce(
    (accu, item) => {
      if (!(accu[item.area] && Array.isArray(accu[item.area].repos))) {
        accu[item.area] = { repos: [] };
      }
      const { dependabotPendings = 0, buildStatus = {} } = withDependabot.find(({ name }) => name === item.repo) ?? {};
      accu[item.area].repos.push({ ...item, dependabotPendings, buildStatus });
      accu = areaTargetsMap.reduce((result, area) => {
        if (item[area.name]) {
          result[area.target].repos.push({ ...item, dependabotPendings, buildStatus });
        }
        return result;
      }, accu);
      return accu;
    },
    { ...areas, ...areaTargetsMap.reduce((result, area) => ({ ...result, [area.target]: { repos: [] } }), {}) }
  );

const badgeUrl = 'badges/coveralls_';
const retrieveCoverageInfo = async repoInfo => {
  const url = `https://coveralls.io/repos/github/mendersoftware/${repoInfo.repo}/badge.svg?branch=${repoInfo.branches ? repoInfo.branches[0] : 'master'}`;
  const coverage = await fetch(url).then(res => {
    const coverage = res.url.substring(res.url.indexOf(badgeUrl) + badgeUrl.length, res.url.indexOf('.svg'));
    return coverage === 'unknown' ? coverage : Number(coverage);
  });
  return Promise.resolve({ ...repoInfo, coverage });
};

const enhanceWithCoverageData = async reposByArea => {
  const requests = reposByArea.product.repos.map(retrieveCoverageInfo);
  const coverageResults = await Promise.all(requests);
  const collector = Object.keys(reposByArea).reduce(
    (accu, area) => {
      accu[area] = { ...reposByArea[area], count: 0, sum: 0 };
      return accu;
    },
    { total: { count: 0, sum: 0 } }
  );
  const sumEnhanced = coverageResults.reduce((accu, repoCoverage) => {
    const { coverage, repo } = repoCoverage;
    const hasCoverage = coverage && coverage !== 'unknown';
    const total = hasCoverage ? { sum: (accu.total.sum += coverage), count: accu.total.count + 1 } : accu.total;
    return Object.keys(reposByArea).reduce(
      (areaCollector, area) => {
        const index = accu[area].repos.findIndex(repoInfo => repoInfo.repo === repo);
        if (index > -1) {
          accu[area].repos[index] = { ...accu[area].repos[index], coverage };
          if (hasCoverage) {
            accu[area] = {
              ...accu[area],
              count: (accu[area].count += 1),
              sum: (accu[area].sum += coverage)
            };
          }
        }
        return areaCollector;
      },
      { ...accu, total }
    );
  }, collector);
  return Object.keys(sumEnhanced).reduce((accu, key) => {
    const { count, sum, ...remainder } = accu[key];
    accu[key] = {
      ...remainder,
      coverage: sum > 0 ? Math.round(sum / count) : 0
    };
    return accu;
  }, sumEnhanced);
};

const repoQuery = gql`
  query getPipeline($login: String!) {
    organization(login: $login) {
      repositories(first: 100) {
        nodes {
          name
          pullRequests(states: [OPEN], labels: ["dependencies"], first: 50) {
            nodes {
              createdAt
              url
            }
            totalCount
          }
        }
      }
    }
  }
`;

const getGithubOrganizationState = async () => {
  if (!process.env.GITHUB_TOKEN) {
    return { untracked: [], withDependabot: [] };
  }
  const repoState = await request({
    url: 'https://api.github.com/graphql',
    variables: { login: 'mendersoftware' },
    document: repoQuery,
    requestHeaders: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
  });
  const { organization = { repositories: {} } } = repoState;
  const {
    repositories: { nodes }
  } = organization;
  return nodes.reduce(
    (accu, { name, pullRequests }) => {
      const isTrackedHere = repos.some(({ repo }) => repo === name);
      const { totalCount } = pullRequests;
      if (!isTrackedHere) {
        accu.untracked.push({ repo: name, dependabotPendings: totalCount });
      }
      if (totalCount) {
        accu.withDependabot.push({ name, dependabotPendings: totalCount });
      }
      return accu;
    },
    { untracked: [], withDependabot: [] }
  );
};

const pipelineQuery = gql`
  query getPipeline($group: ID!, $ref: String!, $cursor: String) {
    group(fullPath: $group) {
      projects(first: 100, after: $cursor) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          name
          fullPath
          pipelines(first: 1, ref: $ref) {
            nodes {
              id
              ref
              status
              commit {
                id
                author {
                  username
                }
                authorName
              }
              jobs(statuses: FAILED, retried: false) {
                nodes {
                  webPath
                }
              }
            }
          }
        }
      }
    }
  }
`;

const gitlabGraphqlUrl = 'https://gitlab.com/api/graphql';
const groups = ['Mender', 'MenderSaaS'];
const gitlabApiRequestHeaders = { headers: { Authorization: `Bearer ${process.env.GITLAB_TOKEN}` } };

const getAllProjects = async (group, ref) => {
  let allProjects = [];
  let cursor = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const data = await request({
      url: gitlabGraphqlUrl,
      document: pipelineQuery,
      variables: { group: `Northern.tech/${group}`, ref, cursor },
      requestHeaders: gitlabApiRequestHeaders.headers
    });

    const projects = data?.group?.projects;
    if (!projects) {
      break;
    }

    allProjects = allProjects.concat(projects.nodes);
    hasNextPage = projects.pageInfo.hasNextPage;
    cursor = projects.pageInfo.endCursor;
  }

  return allProjects;
};

const getGitlabPipelinesState = async () => {
  if (!process.env.GITLAB_TOKEN) {
    return [];
  }
  if (!existsSync('responses')) {
    await fs.mkdir('responses');
  }
  const retrievalTargets = groups.flatMap(group => mainBranches.map(ref => ({ ref, group })));
  const pipelinesRetrieval = retrievalTargets.map(async ({ ref, group }) => {
    let pipelines = [];
    try {
      const allProjects = await getAllProjects(group, ref);
      console.log(`(BuildStatus): fetched ${allProjects.length} projects for ${group}/${ref}`);
      await fs.writeFile(`responses/${group}-${ref}-pipelineResponse.json`, JSON.stringify(allProjects));
      pipelines = allProjects.filter(project => !!project.pipelines.nodes.length);
    } catch (error) {
      console.error(`(Gitlab BuildStatus): GraphQL query failed for ref ${ref}:`, error);
      return pipelines;
    }
    return pipelines;
  });
  const pipelines = await Promise.all(pipelinesRetrieval);
  const collectedPipelines = pipelines.flat();
  const result = collectedPipelines.reduce((accu, repoPipeline) => {
    if (accu[repoPipeline.fullPath]) {
      return accu;
    }
    const pipeline = repoPipeline.pipelines.nodes[0];
    const checkedRepo = repos.find(({ repo }) => repo === repoPipeline.name);
    const hasBranchMismatch = !(checkedRepo?.branches ?? defaultBranches).includes(pipeline.ref);
    if (hasBranchMismatch) {
      console.warn(`(BuildStatus): ${repoPipeline.name} is not expected to track the ${pipeline.ref} branch.`);
      return accu;
    }
    accu[repoPipeline.fullPath] = {
      name: repoPipeline.name,
      fullPath: repoPipeline.fullPath,
      pipelineId: pipeline.id.substring(pipeline.id.lastIndexOf('/') + 1),
      status: pipeline.status,
      commit: {
        id: pipeline.commit.id.substring(pipeline.commit.id.lastIndexOf('/') + 1),
        author: pipeline.commit.authorName || pipeline.commit.author?.username || ''
      },
      failedJob: pipeline.jobs.nodes.length ? pipeline.jobs.nodes[0].webPath : ''
    };
    return accu;
  }, {});
  return Object.values(result);
};

const enhanceWithBuildStatusData = (withDependabot, pipelineBuildStatusInfo) =>
  pipelineBuildStatusInfo.reduce((accu, item) => {
    const itemIndex = accu.findIndex(repoInfo => repoInfo.name === item.name);
    if (itemIndex > -1) {
      accu[itemIndex] = { ...accu[itemIndex], buildStatus: item };
    } else {
      accu.push({ name: item.name, buildStatus: item });
    }
    return accu;
  }, withDependabot);

export async function getStaticProps() {
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
  const { untracked, withDependabot } = await getGithubOrganizationState();
  const pipelineStates = await getGitlabPipelinesState();
  const withDependabotAndPipelineStatus = await enhanceWithBuildStatusData(withDependabot, pipelineStates);
  const reposByArea = transformReposIntoAreas(withDependabotAndPipelineStatus);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { client, executable, staging, supported, ...remainder } = reposByArea;

  const coverageCollection = await enhanceWithCoverageData({ ...remainder, client });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { product: dropHereToo, ...componentsByArea } = coverageCollection;
  await fs.writeFile('repoBuildStatus.json', JSON.stringify(coverageCollection));
  return {
    props: {
      componentsByArea,
      supported,
      untracked
    }
  };
}

export default BuildStatus;
