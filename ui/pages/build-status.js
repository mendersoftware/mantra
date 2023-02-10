import React from 'react';

import { Accordion, AccordionDetails, AccordionSummary, Button, Stack, Typography } from '@mui/material';
import { Circle, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';

import Link from '../components/link';
import { getLatestNightlies, openNightlyClick } from './nightlies';

const areas = {
  backend: 'backend',
  client: 'client',
  docs: 'docs',
  frontend: 'frontend',
  saas: 'saas',
  qa: 'qa'
};

const repos = [
  { repo: 'app-update-module', staging: false, isExecutable: false, isProduct: true, area: areas.client },
  { repo: 'auditlogs', staging: true, isExecutable: false, isProduct: true, area: areas.backend },
  { repo: 'create-artifact-worker', staging: true, isExecutable: false, isProduct: true, area: areas.backend },
  { repo: 'deployments-enterprise', staging: true, isExecutable: false, isProduct: true, area: areas.backend },
  { repo: 'deployments', staging: false, isExecutable: false, isProduct: true, area: areas.backend },
  { repo: 'deviceauth-enterprise', staging: true, isExecutable: false, isProduct: true, area: areas.backend },
  { repo: 'deviceauth', staging: false, isExecutable: false, isProduct: true, area: areas.backend },
  { repo: 'deviceconfig', staging: true, isExecutable: false, isProduct: true, area: areas.backend },
  { repo: 'deviceconnect', staging: true, isExecutable: false, isProduct: true, area: areas.backend },
  { repo: 'devicemonitor', staging: true, isExecutable: false, isProduct: true, area: areas.backend },
  { repo: 'generate-delta-worker', staging: true, isExecutable: false, isProduct: true, area: areas.backend },
  { repo: 'go-lib-micro', staging: false, isExecutable: false, isProduct: false, area: areas.backend },
  { repo: 'gui', staging: true, isExecutable: false, isProduct: true, area: areas.frontend },
  { repo: 'integration-test-runner', staging: false, isExecutable: false, isProduct: false, area: areas.qa },
  { repo: 'integration', staging: true, isExecutable: false, isProduct: false, area: areas.qa },
  { repo: 'inventory-enterprise', staging: true, isExecutable: false, isProduct: true, area: areas.backend },
  { repo: 'inventory', staging: false, isExecutable: false, isProduct: true, area: areas.backend },
  { repo: 'iot-manager', staging: true, isExecutable: false, isProduct: true, area: areas.backend },
  { repo: 'mender-api-docs', staging: false, isExecutable: false, isProduct: false, area: areas.docs },
  { repo: 'mender-api-gateway-docker', staging: false, isExecutable: false, isProduct: false, area: areas.backend },
  { repo: 'mender-artifact', staging: true, isExecutable: true, isProduct: true, area: areas.client },
  { repo: 'mender-binary-delta', staging: true, isExecutable: true, isProduct: true, area: areas.client },
  { repo: 'mender-cli', staging: true, isExecutable: true, isProduct: true, area: areas.backend },
  { repo: 'mender-configure-module', staging: true, isExecutable: true, isProduct: true, area: areas.client },
  { repo: 'mender-connect', staging: true, isExecutable: true, isProduct: true, area: areas.client },
  { repo: 'mender-convert', staging: true, isExecutable: true, isProduct: true, area: areas.client },
  { repo: 'mender-demo-artifact', staging: false, isExecutable: false, isProduct: false, area: areas.frontend },
  { repo: 'mender-dist-packages', staging: false, isExecutable: false, isProduct: false, area: areas.client },
  { repo: 'mender-docs-site', staging: false, isExecutable: false, isProduct: false, area: areas.docs },
  { repo: 'mender-docs', branches: ['master', 'hosted'], staging: false, isExecutable: false, isProduct: false, area: areas.docs },
  { repo: 'mender-flash', staging: true, isExecutable: true, isProduct: true, area: areas.client },
  { repo: 'mender-gateway', staging: true, isExecutable: true, isProduct: true, area: areas.backend },
  { repo: 'mender-helm', staging: false, isExecutable: false, isProduct: false, area: areas.saas },
  { repo: 'mender-image-tests', staging: false, isExecutable: false, isProduct: false, area: areas.client },
  { repo: 'mender-stress-test-client', staging: false, isExecutable: false, isProduct: false, area: areas.qa },
  { repo: 'mender-test-containers', staging: false, isExecutable: false, isProduct: false, area: areas.qa },
  { repo: 'mender', staging: true, isExecutable: true, isProduct: true, area: areas.client },
  { repo: 'mendertesting', staging: false, isExecutable: false, isProduct: false, area: areas.qa },
  { repo: 'meta-mender', staging: true, isExecutable: false, isProduct: true, area: areas.client },
  { repo: 'mtls-ambassador', staging: true, isExecutable: true, isProduct: true, area: areas.backend },
  { repo: 'openssl', staging: false, isExecutable: false, isProduct: false, area: areas.client },
  { repo: 'progressbar', staging: false, isExecutable: false, isProduct: false, area: areas.client },
  { repo: 'reporting', staging: true, isExecutable: false, isProduct: true, area: areas.backend },
  { repo: 'saas-tools', staging: false, isExecutable: false, isProduct: false, area: areas.saas },
  { repo: 'saas', organization: 'MenderSaas', staging: false, isExecutable: false, isProduct: false, area: areas.saas },
  { repo: 'sre-tools', staging: false, isExecutable: false, isProduct: false, area: areas.saas },
  { repo: 'tenantadm', staging: true, isExecutable: false, isProduct: true, area: areas.backend },
  { repo: 'useradm-enterprise', staging: true, isExecutable: false, isProduct: true, area: areas.backend },
  { repo: 'useradm', staging: false, isExecutable: false, isProduct: true, area: areas.backend },
  { repo: 'workflows-enterprise', staging: true, isExecutable: false, isProduct: true, area: areas.backend },
  { repo: 'workflows', staging: false, isExecutable: false, isProduct: true, area: areas.backend }
];

const CoverageDisplay = ({ coverage }) => !!coverage && coverage !== 'unknown' && <Typography color="text.disabled">Coverage: {coverage}%</Typography>;

const RepoStatusItem = ({ repo, organization = 'Mender', branch = 'master', coverage }) => (
  <Stack direction="row" justifyContent="space-between">
    <Stack direction="row" alignContent="center" spacing={2}>
      <Link href={`https://gitlab.com/Northern.tech/${organization}/${repo}/-/pipelines`}>
        <img alt={`${repo} ${branch} build-status`} src={`https://gitlab.com/Northern.tech/${organization}/${repo}/badges/${branch}/pipeline.svg`} />
      </Link>
      <Link href={`https://gitlab.com/Northern.tech/${organization}/${repo}/-/commits/${branch}`}>
        <Typography variant="subtitle2">
          {repo} {branch !== 'master' ? branch : ''}
        </Typography>
      </Link>
    </Stack>
    <Stack direction="row" alignContent="center" spacing={2.5}>
      <CoverageDisplay coverage={coverage} />
      <div style={{ width: '1em' }} />
    </Stack>
  </Stack>
);

const buildStatusColorMap = {
  CANCELED: 'inherit',
  FAILED: 'error',
  RUNNING: 'warning',
  SUCCESS: 'success',
  default: 'secondary' // WTF is going on colour! - we can't use a color variant string here (like warning.dark), as a color prop
};

export const buildStatusColor = status => buildStatusColorMap[status] || buildStatusColorMap.default;

const BuildStatus = ({ componentsByArea, latestNightly, ltsReleases, versions }) => {
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
            {component.repos.map(({ repo, branches = ['master'], coverage, organization }) =>
              branches.map(branch => <RepoStatusItem key={`${repo}-${branch}`} repo={repo} branch={branch} coverage={coverage} organization={organization} />)
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
    </>
  );
};

const areaTargetsMap = [
  { name: 'staging', target: 'staging' },
  { name: 'isExecutable', target: 'executable' },
  { name: 'isProduct', target: 'product' }
];

const transformReposIntoAreas = () =>
  repos.reduce(
    (accu, item) => {
      if (!(accu[item.area] && Array.isArray(accu[item.area].repos))) {
        accu[item.area] = { repos: [] };
      }
      accu[item.area].repos.push(item);
      accu = areaTargetsMap.reduce((result, area) => {
        if (item[area.name] || item[area]) {
          (result[area.target] || result[area]).repos.push(item);
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

export async function getStaticProps() {
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
  const aYearAgo = cutoffDate.toISOString().split('T')[0];
  const versionsInfo = await fetch('https://docs.mender.io/releases/versions.json');
  const versions = await versionsInfo.json();
  const reposByArea = transformReposIntoAreas();
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

  const latestNightly = await getLatestNightlies(new Date(), 1);
  const coverageCollection = await enhanceWithCoverageData({ ...remainder, client });
  const { product: dropHereToo, ...componentsByArea } = coverageCollection;
  return {
    props: {
      componentsByArea,
      latestNightly: latestNightly[0],
      ltsReleases: versions.lts,
      versions: shownVersions
    }
  };
}

export default BuildStatus;
