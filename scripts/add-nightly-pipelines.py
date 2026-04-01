#!/usr/bin/env python3
"""Automate nightly pipeline scheduler creation and mantra UI updates.

1. Creates GitLab pipeline schedulers for a release branch on mender-server,
   mender-server-enterprise and integration repos
2. Updates nightlies.js and build-status.js in the `mantra` repo
3. Optionally removes old version entries,
4. Opens a GitHub PR with the changes

Note on the integration repo:
  The integration pipeline always runs on its own branch (default: master),
  NOT on the release branch. The server version under test is passed via the
  MENDER_SERVER_TAG pipeline variable instead

  Use --integration-ref to override the branch if needed

Usage examples:
  # Add 4.2.x nightlies (integration runs on master by default):
  python3 scripts/add-nightly-pipelines.py --version 4.2.x --ticket QA-1600

  # Same but with custom crons and integration on a different branch:
  python3 scripts/add-nightly-pipelines.py --version 4.2.x \\
      --integration-ref main \\
      --cron-mender-server "0 2 * * *" \\
      --ticket QA-1600

  # Add 4.2.x and retire 4.1.x in one go:
  python3 scripts/add-nightly-pipelines.py --version 4.2.x \\
      --remove-version 4.1.x --ticket QA-1600
"""

import argparse
import os
import re
import subprocess
import sys

import requests

from common import logger

GITLAB_API_BASE = "https://gitlab.com/api/v4"

REPOS = {
    "mender-server": "56468016",
    "mender-server-enterprise": "58146690",
    "integration": "12670314",
}

SCHEDULE_NAMES = {
    "mender-server": "Integration mender-server:{version}",
    "mender-server-enterprise": "Integration mender-server-enterprise:{version}",
    "integration": "Full integration mender-server:{version}",
}

# Default pipeline variables per repo. The integration ones use {version}
# as a placeholder — it gets replaced with the actual --version value at runtime.
DEFAULT_VARS = {
    "mender-server": {
        "NIGHTLY_BUILD": "true",
    },
    "mender-server-enterprise": {
        "NIGHTLY_BUILD": "true",
    },
    "integration": {
        "XDIST_JOBS_IN_PARALLEL_INTEGRATION": "4",
        "CI_JOBS_IN_PARALLEL_INTEGRATION": "4",
        "MENDER_CLIENT_TAG": "mender-master",
        "MENDER_SERVER_TAG": "{version}",
        "RUN_TESTS_FULL_INTEGRATION": "true",
        "NIGHTLY_BUILD": "true",
    },
}


def create_pipeline_schedule(
        token, project_path, ref, description, cron, cron_timezone, variables, dry_run
):
    """Register a new nightly schedule on GitLab for the given branch

    Won't create duplicates — if a schedule already targets the same ref
    we just hand back its ID so the rest of the script can carry on
    """
    if dry_run:
        logger.info(
            f"[DRY RUN] Would create schedule on {project_path}: "
            f"ref={ref}, cron='{cron}', tz={cron_timezone}, desc='{description}'"
        )
        return 0

    headers = {"PRIVATE-TOKEN": token}
    url = f"{GITLAB_API_BASE}/projects/{project_path}/pipeline_schedules"
    resp = requests.get(url, headers=headers)
    if not resp.ok:
        logger.error(f"GET {url} failed ({resp.status_code}): {resp.text}")
        resp.raise_for_status()
    existing = [s for s in resp.json() if s["ref"] == ref]
    if existing:
        schedule = existing[0]
        logger.info(
            f"Schedule already exists for {project_path} ref={ref}: "
            f"id={schedule['id']} ({schedule['description']})"
        )
        return schedule["id"]

    data = {
        "description": description,
        "ref": ref,
        "cron": cron,
        "cron_timezone": cron_timezone,
        "active": True,
    }
    resp = requests.post(url, headers=headers, data=data)
    if resp.status_code == 400:
        logger.error(
            f"400 Bad Request creating schedule on project {project_path} for ref={ref}. "
            f"Does the branch '{ref}' exist in this repo? GitLab response: {resp.text}"
        )
        sys.exit(1)
    if not resp.ok:
        logger.error(f"POST {url} failed ({resp.status_code}): {resp.text}")
        resp.raise_for_status()
    schedule = resp.json()
    schedule_id = schedule["id"]
    logger.info(f"Created schedule on {project_path}: id={schedule_id}, desc='{description}'")

    if variables:
        var_url = f"{url}/{schedule_id}/variables"
        for key, value in variables.items():
            resp = requests.post(var_url, headers=headers, data={"key": key, "value": value})
            resp.raise_for_status()
            logger.info(f"  Added variable {key}={value}")

    return schedule_id


def delete_pipeline_schedules_for_version(token, project_path, version, dry_run):
    """Clean up old nightly schedules we no longer need

    Finds every schedule pointing at the given branch and removes it
    so stale nightlies don't keep firing after a version is retired
    """
    if dry_run:
        logger.info(f"[DRY RUN] Would delete schedules for ref={version} on {project_path}")
        return []

    headers = {"PRIVATE-TOKEN": token}
    url = f"{GITLAB_API_BASE}/projects/{project_path}/pipeline_schedules"
    resp = requests.get(url, headers=headers)
    if not resp.ok:
        logger.error(f"GET {url} failed ({resp.status_code}): {resp.text}")
        resp.raise_for_status()
    to_delete = [s for s in resp.json() if s["ref"] == version]
    deleted = []
    for schedule in to_delete:
        del_url = f"{url}/{schedule['id']}"
        resp = requests.delete(del_url, headers=headers)
        resp.raise_for_status()
        logger.info(
            f"Deleted schedule on {project_path}: "
            f"id={schedule['id']} ({schedule['description']})"
        )
        deleted.append(schedule)
    return deleted


def _make_pipeline_entry(name, project_path, schedule_id):
    """Build a JS object literal that looks exactly like the ones in nightlies.js"""
    return (
        "  {\n"
        f"    name: '{name}',\n"
        f"    projectPath: '{project_path}',\n"
        f"    pipelineScheduleId: {schedule_id}\n"
        "  }"
    )


def _find_entry_end(lines, start_idx):
    """Walk forward from a line inside a JS object to find its closing brace"""
    for i in range(start_idx, len(lines)):
        if lines[i].strip() in ("}", "},"):
            return i
    return start_idx


def add_entries_to_nightlies_js(content, version, schedule_ids):
    """Splice new pipeline entries into nightlies.js right after each repo's
    existing "main" entry, so they show up grouped together in the UI

    We locate each repo by its well-known schedule ID and insert below it
    """
    lines = content.split("\n")

    anchor_configs = [
        {
            "key": "mender-server",
            "anchor_id": "2738796",
            "name": SCHEDULE_NAMES["mender-server"].format(version=version),
            "path": REPOS["mender-server"],
        },
        {
            "key": "mender-server-enterprise",
            "anchor_id": "2738797",
            "name": SCHEDULE_NAMES["mender-server-enterprise"].format(version=version),
            "path": REPOS["mender-server-enterprise"],
        },
        {
            "key": "integration",
            "anchor_id": "2766723",
            "name": SCHEDULE_NAMES["integration"].format(version=version),
            "path": REPOS["integration"],
        },
    ]

    insertions = []
    for config in anchor_configs:
        schedule_id = schedule_ids.get(config["key"])
        if schedule_id is None:
            continue

        anchor_line_idx = None
        for i, line in enumerate(lines):
            if f"pipelineScheduleId: {config['anchor_id']}" in line:
                anchor_line_idx = i
                break

        if anchor_line_idx is None:
            continue

        entry_end = _find_entry_end(lines, anchor_line_idx)
        new_entry = _make_pipeline_entry(config["name"], config["path"], schedule_id)
        insertions.append((entry_end, new_entry))

    insertions.sort(key=lambda x: x[0], reverse=True)

    for insert_idx, entry_text in insertions:
        new_block = entry_text + ","
        lines.insert(insert_idx + 1, new_block)

    return "\n".join(lines)


def remove_entries_from_nightlies_js(content, version):
    """Strip out all nightlies.js entries for a retired release branch

    Matches on the ':{version}' pattern in the name field and removes the
    whole object block so the UI stops showing pipelines we no longer run
    """
    lines = content.split("\n")
    result_lines = []
    skip_until_close = False
    i = 0

    while i < len(lines):
        line = lines[i]

        if not skip_until_close and f":{version}'" in line and "name:" in line:
            while result_lines and result_lines[-1].strip() in ("{", ""):
                result_lines.pop()
            skip_until_close = True
            i += 1
            continue

        if skip_until_close:
            if line.strip() in ("},", "}"):
                skip_until_close = False
            i += 1
            continue

        result_lines.append(line)
        i += 1

    return "\n".join(result_lines)


def add_version_to_build_status_js(content, version):
    """Tell the build-status page to start tracking a new release branch

    Appends the version to the supportedBranches array for both
    mender-server and mender-server-enterprise
    """
    target_repos = ("mender-server-enterprise", "mender-server")
    lines = content.split("\n")
    result_lines = []
    current_repo = None

    for line in lines:
        repo_match = re.search(r"repo:\s*'([^']+)'", line)
        if repo_match:
            current_repo = repo_match.group(1)

        if (
                current_repo in target_repos
                and "supportedBranches:" in line
                and f"'{version}'" not in line
        ):
            line = re.sub(
                r"(supportedBranches:\s*\[[^\]]*)\]",
                rf"\1, '{version}']",
                line,
            )

        result_lines.append(line)

    return "\n".join(result_lines)


def remove_version_from_build_status_js(content, version):
    """Stop the build-status page from tracking a retired release branch"""
    target_repos = ("mender-server-enterprise", "mender-server")
    lines = content.split("\n")
    result_lines = []
    current_repo = None

    for line in lines:
        repo_match = re.search(r"repo:\s*'([^']+)'", line)
        if repo_match:
            current_repo = repo_match.group(1)

        if current_repo in target_repos and "supportedBranches:" in line:
            line = line.replace(f", '{version}'", "")
            line = line.replace(f"'{version}', ", "")
            line = line.replace(f"'{version}'", "")

        result_lines.append(line)

    return "\n".join(result_lines)


def generate_branch_name(version, ticket):
    """Come up with a branch name like ex. QA-1600/add-4.2.x-nightly-pipelines"""
    base = f"add-{version}-nightly-pipelines"
    if ticket:
        return f"{ticket}/{base}"
    return base


def generate_commit_message(version, ticket):
    """Build conventional-commit message with an optional ticket in footer"""
    msg = f"feat(nightlies): add {version} nightly pipeline schedules"
    if ticket:
        msg += f"\n\nTicket: {ticket}"
    return msg


def run_git(args, cwd, dry_run=False):
    """Run git command, scream loudly if it fails"""
    cmd = ["git"] + args
    if dry_run:
        logger.info(f"[DRY RUN] Would run: {' '.join(cmd)}")
        return ""
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if result.returncode != 0:
        logger.error(f"git command failed: {' '.join(cmd)}\n{result.stderr}")
        sys.exit(1)
    return result.stdout.strip()


def run_gh(args, cwd, dry_run=False):
    """Run GitHub CLI command, scream loudly if it fails"""
    cmd = ["gh"] + args
    if dry_run:
        logger.info(f"[DRY RUN] Would run: {' '.join(cmd)}")
        return ""
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if result.returncode != 0:
        logger.error(f"gh command failed: {' '.join(cmd)}\n{result.stderr}")
        sys.exit(1)
    return result.stdout.strip()


def create_mantra_pr(
        mantra_repo_path,
        version,
        remove_version,
        schedule_ids,
        ticket,
        dry_run,
):
    """Update the mantra UI files, push branch and open PR"""
    # Start from a clean, up-to-date master so we don't branch off stale code
    logger.info("Checking out master and pulling latest changes...")
    run_git(["checkout", "master"], mantra_repo_path, dry_run)
    run_git(["pull"], mantra_repo_path, dry_run)

    nightlies_path = os.path.join(mantra_repo_path, "ui", "pages", "nightlies.js")
    build_status_path = os.path.join(mantra_repo_path, "ui", "pages", "build-status.js")

    with open(nightlies_path, "r") as f:
        nightlies_content = f.read()
    with open(build_status_path, "r") as f:
        build_status_content = f.read()

    nightlies_content = add_entries_to_nightlies_js(nightlies_content, version, schedule_ids)
    if remove_version:
        nightlies_content = remove_entries_from_nightlies_js(nightlies_content, remove_version)

    build_status_content = add_version_to_build_status_js(build_status_content, version)
    if remove_version:
        build_status_content = remove_version_from_build_status_js(
            build_status_content, remove_version
        )

    if dry_run:
        logger.info("[DRY RUN] Would modify nightlies.js and build-status.js")
        logger.info(f"[DRY RUN] New nightlies.js entries for version {version}")
        if remove_version:
            logger.info(f"[DRY RUN] Would remove entries for version {remove_version}")
        return

    with open(nightlies_path, "w") as f:
        f.write(nightlies_content)
    with open(build_status_path, "w") as f:
        f.write(build_status_content)

    branch = generate_branch_name(version, ticket)
    commit_msg = generate_commit_message(version, ticket)

    user_name = run_git(["config", "user.name"], mantra_repo_path)
    user_email = run_git(["config", "user.email"], mantra_repo_path)
    signoff = f"Signed-off-by: {user_name} <{user_email}>"
    full_commit_msg = f"{commit_msg}\n\n{signoff}"

    run_git(["checkout", "-b", branch], mantra_repo_path)
    run_git(["add", nightlies_path, build_status_path], mantra_repo_path)
    run_git(["commit", "-m", full_commit_msg], mantra_repo_path)
    run_git(["push", "-u", "origin", branch], mantra_repo_path)

    pr_body = f"Add pipeline schedule entries for {version} nightly pipelines.\n\n"
    pr_body += "**New schedule IDs:**\n"
    for repo_key, sid in schedule_ids.items():
        pr_body += f"- {repo_key}: {sid}\n"
    if remove_version:
        pr_body += f"\n**Removed:** {remove_version} entries from nightlies and build-status.\n"
    if ticket:
        pr_body += f"\nTicket: {ticket}"

    pr_title = f"feat(nightlies): add {version} nightly pipeline schedules"
    pr_url = run_gh(
        ["pr", "create", "--title", pr_title, "--body", pr_body, "--base", "master"],
        mantra_repo_path,
    )
    logger.info(f"PR created: {pr_url}")
    return pr_url


def parse_variables(var_string):
    """Turn a comma-separated 'KEY=val,KEY2=val2' string into a dict"""
    if not var_string:
        return {}
    result = {}
    for pair in var_string.split(","):
        key, value = pair.split("=", 1)
        result[key.strip()] = value.strip()
    return result


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description="Automate nightly pipeline scheduler creation and mantra UI updates."
    )
    parser.add_argument(
        "--version", required=True, help="Release branch name (e.g., 4.2.x)"
    )
    parser.add_argument(
        "--remove-version",
        default=None,
        help="Old version to remove from GitLab schedulers and mantra UI",
    )
    parser.add_argument(
        "--gitlab-token",
        default=os.getenv("GITLAB_TOKEN"),
        help="GitLab API token (default: $GITLAB_TOKEN env var)",
    )
    parser.add_argument(
        "--mantra-repo-path",
        default=os.getcwd(),
        help="Path to local mantra repo checkout (default: current directory)",
    )
    parser.add_argument(
        "--cron-mender-server",
        default="0 1 * * *",
        help="Cron expression for mender-server scheduler (default: '0 1 * * *')",
    )
    parser.add_argument(
        "--cron-mender-server-enterprise",
        default="0 1 * * *",
        help="Cron expression for mender-server-enterprise scheduler",
    )
    parser.add_argument(
        "--cron-integration",
        default="0 1 * * *",
        help="Cron expression for integration scheduler",
    )
    parser.add_argument(
        "--integration-ref",
        default="master",
        help="Git ref (branch) for the integration scheduler. Defaults to 'master' "
             "because integration runs on master and receives the server version "
             "via the MENDER_SERVER_TAG variable instead.",
    )
    parser.add_argument(
        "--timezone", default="UTC", help="Timezone for cron schedules (default: UTC)"
    )
    parser.add_argument(
        "--vars-mender-server",
        default=None,
        help="Pipeline variables for mender-server as KEY=val,KEY2=val2",
    )
    parser.add_argument(
        "--vars-mender-server-enterprise",
        default=None,
        help="Pipeline variables for mender-server-enterprise",
    )
    parser.add_argument(
        "--vars-integration",
        default=None,
        help="Pipeline variables for integration",
    )
    parser.add_argument(
        "--ticket", default=None, help="Jira ticket number for commit message"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without executing",
    )
    return parser.parse_args(argv)


def main():
    args = parse_args()

    if not args.gitlab_token:
        logger.error("GitLab token required. Use --gitlab-token or set GITLAB_TOKEN env var.")
        sys.exit(1)

    schedule_ids = {}

    # ================ ================ ================
    #           Delete old version schedulers (if requested)
    # ================ ================ ================
    if args.remove_version:
        logger.info(f"=== Removing old schedulers for version {args.remove_version} ===")
        for repo_key, project_path in REPOS.items():
            deleted = delete_pipeline_schedules_for_version(
                token=args.gitlab_token,
                project_path=project_path,
                version=args.remove_version,
                dry_run=args.dry_run,
            )
            if not deleted:
                logger.info(f"No schedulers found for {args.remove_version} on {project_path}")

    # ================ ================ ================
    #               Create new schedulers
    # ================ ================ ================
    logger.info(f"=== Creating schedulers for version {args.version} ===")
    cron_map = {
        "mender-server": args.cron_mender_server,
        "mender-server-enterprise": args.cron_mender_server_enterprise,
        "integration": args.cron_integration,
    }
    vars_map = {}
    user_vars = {
        "mender-server": parse_variables(args.vars_mender_server),
        "mender-server-enterprise": parse_variables(args.vars_mender_server_enterprise),
        "integration": parse_variables(args.vars_integration),
    }
    for repo_key in REPOS:
        # Start with defaults, let user overrides win
        merged = {}
        for k, v in DEFAULT_VARS.get(repo_key, {}).items():
            merged[k] = v.format(version=args.version)
        merged.update(user_vars[repo_key])
        vars_map[repo_key] = merged

    # integration schedules on its own branch (default: master) and picks up
    # the server version via MENDER_SERVER_TAG. The other repos schedule
    # directly on the release branch.
    ref_map = {
        "mender-server": args.version,
        "mender-server-enterprise": args.version,
        "integration": args.integration_ref,
    }

    for repo_key, project_path in REPOS.items():
        description = SCHEDULE_NAMES[repo_key].format(version=args.version)
        sid = create_pipeline_schedule(
            token=args.gitlab_token,
            project_path=project_path,
            ref=ref_map[repo_key],
            description=description,
            cron=cron_map[repo_key],
            cron_timezone=args.timezone,
            variables=vars_map[repo_key],
            dry_run=args.dry_run,
        )
        schedule_ids[repo_key] = sid

    # ================ ================ ================
    #                   Create mantra PR
    # ================ ================ ================
    logger.info("=== Creating mantra PR ===")
    create_mantra_pr(
        mantra_repo_path=args.mantra_repo_path,
        version=args.version,
        remove_version=args.remove_version,
        schedule_ids=schedule_ids,
        ticket=args.ticket,
        dry_run=args.dry_run,
    )

    logger.info("=== Done! ===")


if __name__ == "__main__":
    main()
