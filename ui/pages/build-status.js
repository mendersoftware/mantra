import React from 'react';

import { request, gql } from 'graphql-request';
import { Accordion, AccordionDetails, AccordionSummary, Button, Stack, Typography } from '@mui/material';
import { Circle, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';

import Link from '../components/link';
import { getLatestNightlies, pipelines } from './nightlies';
import { buildStatusColor, openNightlyClick } from '../src/constants';

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
  { repo: 'mender-binary-delta', staging: true, isExecutable: true, isProduct: true, area: areas.client },
  { repo: 'mender-cli', staging: true, isExecutable: true, isProduct: true, area: areas.backend },
  { repo: 'mender-configure-module', staging: true, isExecutable: true, isProduct: true, area: areas.client },
  { repo: 'mender-connect', staging: true, isExecutable: true, isProduct: true, area: areas.client },
  { repo: 'mender-convert', staging: true, isExecutable: true, isProduct: true, area: areas.client },
  { repo: 'mender-demo-artifact', staging: false, isExecutable: false, isProduct: false, area: areas.backend },
  { repo: 'mender-dist-packages', staging: false, isExecutable: false, isProduct: false, area: areas.client },
  { repo: 'mender-docs-changelog', staging: false, isExecutable: false, isProduct: false, area: areas.docs },
  { repo: 'mender-docs-site', staging: false, isExecutable: false, isProduct: false, area: areas.docs },
  { repo: 'mender-docs', branches: ['master', 'hosted'], staging: false, isExecutable: false, isProduct: false, area: areas.docs },
  { repo: 'mender-flash', staging: true, isExecutable: true, isProduct: true, area: areas.client },
  { repo: 'mender-gateway', staging: true, isExecutable: true, isProduct: true, area: areas.backend },
  { repo: 'mender-helm', staging: false, isExecutable: false, isProduct: false, area: areas.saas },
  { repo: 'mender-image-tests', staging: false, isExecutable: false, isProduct: false, area: areas.client },
  { repo: 'mender-orchestrator', staging: false, isExecutable: true, isProduct: true, area: areas.client },
  { repo: 'mender-server-enterprise', branches: ['main'], staging: true, isExecutable: false, isProduct: true, area: areas.backend },
  { repo: 'mender-server', branches: ['main'], staging: false, isExecutable: false, isProduct: true, area: areas.backend },
  { repo: 'mender-setup', staging: false, isExecutable: false, isProduct: true, area: areas.client },
  { repo: 'mender-snapshot', staging: false, isExecutable: false, isProduct: true, area: areas.client },
  { repo: 'mender-stress-test-client', staging: false, isExecutable: false, isProduct: false, area: areas.qa },
  { repo: 'mender-test-containers', staging: false, isExecutable: false, isProduct: false, area: areas.qa },
  { repo: 'mender', staging: true, isExecutable: true, isProduct: true, area: areas.client },
  { repo: 'mendertesting', staging: false, isExecutable: false, isProduct: false, area: areas.qa },
  { repo: 'meta-mender', staging: true, isExecutable: false, isProduct: true, area: areas.client },
  { repo: 'monitor-client', staging: false, isExecutable: true, isProduct: true, area: areas.client },
  { repo: 'openssl', staging: false, isExecutable: false, isProduct: false, area: areas.client },
  { repo: 'progressbar', staging: false, isExecutable: false, isProduct: false, area: areas.client },
  { repo: 'saas-tools', staging: false, isExecutable: false, isProduct: false, area: areas.saas },
  { repo: 'saas', organization: 'MenderSaas', staging: false, isExecutable: false, isProduct: false, area: areas.saas },
  { repo: 'sre-tools', staging: false, isExecutable: false, isProduct: false, area: areas.saas }
];

const minWidth = { style: { minWidth: 110 } };
const CoverageDisplay = ({ coverage }) =>
  !!coverage && coverage !== 'unknown' ? (
    <Typography color="text.disabled" {...minWidth}>
      Coverage: {coverage}%
    </Typography>
  ) : (
    <div {...minWidth} />
  );

const RepoStatusItem = ({ repo, organization = 'Mender', branch = 'master', coverage, dependabotPendings }) => (
  <Stack direction="row" justifyContent="space-between">
    <Stack direction="row" alignContent="center" spacing={2}>
      <Link href={`https://gitlab.com/Northern.tech/${organization}/${repo}/-/pipelines?ref=${branch}`}>
        <img alt={`${repo} ${branch} build-status`} src={`https://gitlab.com/Northern.tech/${organization}/${repo}/badges/${branch}/pipeline.svg`} />
      </Link>
      <Link href={`https://github.com/mendersoftware/${repo}/tree/${branch}`} target="_blank">
        <Typography variant="subtitle2">
          {repo} {branch !== 'master' ? branch : ''}
        </Typography>
      </Link>
    </Stack>
    <Stack direction="row" alignItems="center" spacing={2.5}>
      {!!dependabotPendings && (
        <Link href={`https://github.com/mendersoftware/${repo}/pulls`} target="_blank" style={{ display: 'flex', alignItems: 'center', columnGap: 10 }}>
          <img alt="dependabot" src="https://avatars.githubusercontent.com/u/27347476?s=20" />
          <div>({dependabotPendings})</div>
        </Link>
      )}
      <CoverageDisplay coverage={coverage} />
      <div style={{ width: '1em' }} />
    </Stack>
  </Stack>
);

const BuildStatus = ({ componentsByArea, latestNightly, ltsReleases, untracked, versions }) => {
  const { total, ...components } = componentsByArea;
  return (
    <>
      <Stack direction="row" justifyContent="space-between" marginBottom={2}>
        <Typography variant="h4">Build Status</Typography>
        <Stack direction="row" alignItems="center" spacing={2}>
          <CoverageDisplay coverage={total.coverage} />
          <Button
            variant="outlined"
            title={latestNightly.startedAt}
            onClick={() => openNightlyClick(latestNightly)}
            endIcon={<Circle color={buildStatusColor(latestNightly.status)} />}
          >
            latest Nightly
          </Button>
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
            {component.repos.map(({ repo, branches = ['master'], coverage, dependabotPendings, organization }) =>
              branches.map(branch => (
                <RepoStatusItem
                  key={`${repo}-${branch}`}
                  repo={repo}
                  branch={branch}
                  coverage={coverage}
                  dependabotPendings={dependabotPendings}
                  organization={organization}
                />
              ))
            )}
          </AccordionDetails>
        </Accordion>
      ))}

      {Object.entries(versions).map(([version, repos], index) => {
        const isLtsRelease = ltsReleases.includes(version);
        return (
          <Accordion key={version} defaultExpanded={index === 0 || isLtsRelease} disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} id={`${version}-header`}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Typography variant="h6">Mender {version}</Typography>
                {isLtsRelease && <Typography variant="button">LTS</Typography>}
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              {repos.map(({ name, version }) => (
                <RepoStatusItem key={name} repo={name} branch={version} />
              ))}
            </AccordionDetails>
          </Accordion>
        );
      })}
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
  { name: 'isProduct', target: 'product' }
];

const transformReposIntoAreas = withDependabot =>
  repos.reduce(
    (accu, item) => {
      if (!(accu[item.area] && Array.isArray(accu[item.area].repos))) {
        accu[item.area] = { repos: [] };
      }
      const { dependabotPendings = 0 } = withDependabot.find(({ name }) => name === item.repo) ?? {};
      accu[item.area].repos.push({ ...item, dependabotPendings });
      accu = areaTargetsMap.reduce((result, area) => {
        if (item[area.name] || item[area]) {
          (result[area.target] || result[area]).repos.push({ ...item, dependabotPendings });
        }
        return result;
      }, accu);
      return accu;
    },
    { ...areas, ...areaTargetsMap.reduce((result, area) => ({ ...result, [area.target]: { repos: [] } }), {}) }
  );

const extractReleaseInfo = releaseInfo =>
  Object.values(releaseInfo).reduce(
    (result, release) => {
      let minorVersion = {
        ...result,
        firstReleaseDate: !result.firstReleaseDate || release.release_date < result.releaseDate ? release.release_date : result.firstReleaseDate
      };
      if (release.repos && release.release_date > minorVersion.releaseDate) {
        minorVersion = { ...minorVersion, releaseDate: release.release_date, repos: release.repos };
      }
      return minorVersion;
    },
    { firstReleaseDate: '', releaseDate: '', repos: [] }
  );

const findRepoInRepoInfo = (repos, repoName) => repos.find(repoInfo => repoName === repoInfo.repo);

const collectStagingInfo = (result, repos, clientRepos, stagingRepos, executableRepos) => {
  if (result) {
    return result;
  }
  return repos.reduce((accu, repo) => {
    const repoInfo = findRepoInRepoInfo(stagingRepos, repo.name);
    if (!repoInfo) {
      return accu;
    }
    const shouldShowVersion = findRepoInRepoInfo(clientRepos, repo.name) || findRepoInRepoInfo(executableRepos, repo.name);
    accu.push({ ...repoInfo, ...repo, version: shouldShowVersion ? repo.version : 'staging' });
    return accu;
  }, []);
};

const badgeUrl = 'badges/coveralls_';
const retrieveCoverageInfo = async repoInfo => {
  const url = `https://coveralls.io/repos/github/mendersoftware/${repoInfo.repo}/badge.svg?branch=master`;
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

export async function getStaticProps() {
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
  const aYearAgo = cutoffDate.toISOString().split('T')[0];
  const versionsInfo = await fetch('https://docs.mender.io/releases/versions.json');
  const versions = await versionsInfo.json();
  const { untracked, withDependabot } = await getGithubOrganizationState();
  const reposByArea = transformReposIntoAreas(withDependabot);
  const { client, executable, staging, ...remainder } = reposByArea;
  const shownVersions = Object.entries(versions.releases).reduce((accu, [version, releaseInfo]) => {
    const { firstReleaseDate, repos } = extractReleaseInfo(releaseInfo);
    if (firstReleaseDate < aYearAgo && !versions.lts.includes(version)) {
      return accu;
    }
    accu.staging = collectStagingInfo(accu.staging, repos, client.repos, staging.repos, executable.repos);
    accu[version] = repos.map(repo => ({ ...repo, version: `${repo.version.substring(0, repo.version.lastIndexOf('.'))}.x` }));
    return accu;
  }, {});

  const latestNightlies = await getLatestNightlies(
    new Date(),
    1,
    pipelines.find(pipeline => pipeline.name === 'Mender Client Acceptance Tests')
  );
  const coverageCollection = await enhanceWithCoverageData({ ...remainder, client });
  const { product: dropHereToo, ...componentsByArea } = coverageCollection;
  return {
    props: {
      componentsByArea,
      latestNightly: latestNightlies.length ? latestNightlies[0] : {},
      ltsReleases: versions.lts,
      untracked,
      versions: shownVersions
    }
  };
}

export default BuildStatus;
