#!/usr/bin/env -S deno run --allow-read --allow-net --allow-env

// Type definitions
interface BuildStatus {
  name: string;
  fullPath: string;
  pipelineId: string;
  status: 'SUCCESS' | 'FAILED' | 'RUNNING' | 'CANCELED' | '';
  commit: {
    id: string;
    author: string;
  };
  failedJob: string;
}

interface Repository {
  repo: string;
  area: string;
  buildStatus: Partial<BuildStatus> | Record<string, never>;
  staging?: boolean;
  isExecutable?: boolean;
  isProduct?: boolean;
  dependabotPendings?: number;
  coverage?: number | string;
}

interface AreaData {
  repos: Repository[];
  coverage?: number;
}

interface RepoStatusFile {
  backend?: AreaData;
  client?: AreaData;
  docs?: AreaData;
  nightlies?: AreaData;
  saas?: AreaData;
  [key: string]: AreaData | { coverage: number } | undefined;
}

interface FailedRepo {
  repo: string;
  author: string;
  pipelineUrl: string;
  jobUrl: string;
}

interface PendingRepo {
  repo: string;
  fullPath?: string;
}

interface AreaAnalysis {
  success: number;
  failed: number;
  pending: number;
  failedRepos: FailedRepo[];
  pendingRepos: PendingRepo[];
}

interface SlackField {
  type: string;
  text: string;
}

interface SlackBlock {
  type: string;
  text?: SlackField;
  fields?: Array<SlackField>;
}

interface SlackMessage {
  blocks: SlackBlock[];
}

const loadRepoStatus = async (filePath: string): Promise<RepoStatusFile> => {
  try {
    const data = await Deno.readTextFile(filePath);
    return JSON.parse(data);
  } catch (error) {
    console.error('[ERROR] Failed to parse repoStatus:', error);
    throw error;
  }
};

const classifyStatus = (buildStatus: Partial<BuildStatus> | Record<string, never>): string => {
  const { status = '' } = (buildStatus as Partial<BuildStatus>) || {};
  if (['SUCCESS', 'FAILED'].includes(status)) {
    return status.toLowerCase();
  }
  return 'pending';
};

const analyzeArea = (area: AreaData, areaName: string): AreaAnalysis => {
  const analysis: AreaAnalysis = {
    success: 0,
    failed: 0,
    pending: 0,
    failedRepos: [],
    pendingRepos: []
  };

  console.log(`[INFO] Processing ${areaName} area: ${area.repos.length} repos`);

  for (const repo of area.repos) {
    const status = classifyStatus(repo.buildStatus);
    const buildStatus = repo.buildStatus as Partial<BuildStatus>;

    if (status === 'success') {
      analysis.success++;
    } else if (status === 'failed') {
      analysis.failed++;

      const author = buildStatus.commit?.author || '';
      const pipelineUrl =
        buildStatus.fullPath && buildStatus.pipelineId ? `https://gitlab.com/${buildStatus.fullPath}/-/pipelines/${buildStatus.pipelineId}` : '';
      const jobUrl = buildStatus.failedJob ? `https://gitlab.com${buildStatus.failedJob}` : '';

      analysis.failedRepos.push({
        repo: repo.repo,
        author,
        pipelineUrl,
        jobUrl
      });
    } else {
      analysis.pending++;
      analysis.pendingRepos.push({ repo: repo.repo, fullPath: buildStatus.fullPath });
    }
  }

  console.log(`[INFO] Stats - Success: ${analysis.success}, Failed: ${analysis.failed}, Pending: ${analysis.pending}`);

  return analysis;
};

const buildEmojiLine = (analysis: AreaAnalysis): string => {
  const emojis: string[] = [];
  if (analysis.success > 0 && analysis.failed === 0 && analysis.pending === 0) {
    emojis.push('🟢');
  }
  emojis.push(...Array.from({ length: analysis.failed }, () => '🔴'));
  emojis.push(...Array.from({ length: analysis.pending }, () => '🟠'));
  return emojis.join(' ');
};

const buildSlackMessage = (areaName: string, analysis: AreaAnalysis): SlackMessage => {
  const emojiLine = buildEmojiLine(analysis);
  const sections: SlackBlock[] = [
    { type: 'section', text: { type: 'mrkdwn', text: `*${areaName.charAt(0).toUpperCase() + areaName.slice(1)}:* ${emojiLine}` } }
  ];
  // If all pass, show success message
  if (analysis.failed === 0 && analysis.pending === 0 && analysis.success > 0) {
    sections.push({ type: 'section', text: { type: 'mrkdwn', text: '🎉 All repositories passing!' } });
    return { blocks: sections };
  }

  if (analysis.failedRepos.length > 0) {
    let sectionContent = '';
    for (const failedRepo of analysis.failedRepos) {
      let failureInfo = `<${failedRepo.pipelineUrl}|Pipeline>`;
      if (failedRepo.jobUrl) {
        failureInfo += ` | <${failedRepo.jobUrl}|Job>`;
      }
      sectionContent += `- *${failedRepo.repo}* - ${failureInfo}\n`;
      if (failedRepo.author) {
        sectionContent += `    _maybe ${failedRepo.author} knows something about their recent change_\n\n`;
      }
    }
    sections.push({ type: 'section', text: { type: 'mrkdwn', text: `*Failed Repositories:*\n\n${sectionContent}` } });
  }

  if (analysis.pendingRepos.length > 0) {
    const sectionContent = analysis.pendingRepos.reduce((accu, { fullPath, repo }) => {
      const repoPath = fullPath ? fullPath : `Northern.tech/Mender/${repo}`;
      accu += `- *${repo}* - <https://gitlab.com/${repoPath}/-/pipelines|Pipelines overview>\n`;
      return accu;
    }, '');
    sections.push({ type: 'section', text: { type: 'mrkdwn', text: `*Pending Repositories:*\n\n${sectionContent}` } });
  }
  return { blocks: sections };
};

const getMoodEnhancer = async () => {
  const jokeResponse = await fetch('https://v2.jokeapi.dev/joke/Programming?blacklistFlags=nsfw,sexist,racist');
  const joke = await jokeResponse.json();
  const blocks: SlackBlock[] = [{ type: 'divider' }];
  if (joke.type === 'single') {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: joke.joke } });
  } else {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: joke.setup } });
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: joke.delivery } });
  }
  return { blocks };
};

const sendToSlackWithRetry = async (webhookUrl: string, message: SlackMessage, maxRetries = 3): Promise<void> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const delay = Math.pow(2, attempt) * 1000;
    try {
      const response = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(message) });

      if (response.ok) {
        console.log('[INFO] Message sent to Slack successfully');
        return;
      }
      if (response.status >= 500 && attempt < maxRetries) {
        console.log(`[WARN] Slack API error ${response.status}, retry ${attempt}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      const responseText = await response.text();
      // Fatal error on 4xx or final retry
      throw new Error(`Slack API returned ${response.status}: ${responseText}`);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      console.log(`[WARN] retry ${attempt}/${maxRetries} after ${delay}ms: ${error instanceof Error ? error.message : String(error)}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

const isWithinNotificationWindow = (): boolean => {
  const now = new Date();
  const hour = now.getUTCHours();

  // Only run weekdays between 07:00 and 08:00 UTC
  return hour === 7 && now.getDay() < 6;
};

const buildStatusFiles = ['ui/nightliesBuildStatus.json', 'ui/repoBuildStatus.json'];
const areas = ['nightlies', 'backend', 'client', 'docs', 'qa', 'saas'] as const;

const main = async () => {
  console.log('[INFO] Starting Slack notification script');

  const isManuallyTriggered = Boolean(Deno.env.get('CI_JOB_MANUAL'));
  if (!isWithinNotificationWindow() && !isManuallyTriggered) {
    const now = new Date();
    console.log(
      `[INFO] Outside notification window (current UTC hour: ${now.getUTCHours()}). Notifications only sent between 09:00-10:00 UTC on weekdays => Exiting!`
    );
    Deno.exit(0);
  }

  console.log('[INFO] Within notification window (09:00-10:00 UTC), proceeding...');

  const webhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');
  if (!webhookUrl) {
    console.error('[ERROR] SLACK_WEBHOOK_URL environment variable not set');
    Deno.exit(1);
  }
  const today = new Intl.DateTimeFormat('nb-NO', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  await sendToSlackWithRetry(webhookUrl, { blocks: [{ type: 'header', text: { type: 'plain_text', text: `Build Status - ${today}` } }] });

  for (const filePath of buildStatusFiles) {
    const data = await loadRepoStatus(filePath);
    for (const [index, areaName] of areas.entries()) {
      const area = data[areaName]!;
      if (!area) {
        continue;
      }
      console.log(`\n[INFO] Processing ${areaName} area`);
      const analysis = analyzeArea(area, areaName);
      const message = buildSlackMessage(areaName, analysis);
      console.log(JSON.stringify(message));
      if (index < areas.length - 1) {
        message.blocks.push({ type: 'divider' });
      }
      await sendToSlackWithRetry(webhookUrl, message);
    }
  }

  const moodEnhancer = await getMoodEnhancer();
  await sendToSlackWithRetry(webhookUrl, moodEnhancer);

  console.log('\n[INFO] All notifications sent successfully');
};

if (import.meta.main) {
  main().catch(error => {
    console.error('[ERROR]', error.message);
    Deno.exit(1);
  });
}
