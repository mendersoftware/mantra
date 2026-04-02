import importlib
import unittest
from unittest.mock import patch, MagicMock

mod = importlib.import_module("add-nightly-pipelines")

create_pipeline_schedule = mod.create_pipeline_schedule
delete_pipeline_schedules_for_version = mod.delete_pipeline_schedules_for_version
add_entries_to_nightlies_js = mod.add_entries_to_nightlies_js
remove_entries_from_nightlies_js = mod.remove_entries_from_nightlies_js
add_version_to_build_status_js = mod.add_version_to_build_status_js
remove_version_from_build_status_js = mod.remove_version_from_build_status_js
generate_branch_name = mod.generate_branch_name
generate_commit_message = mod.generate_commit_message
parse_args = mod.parse_args
parse_variables = mod.parse_variables
REPOS = mod.REPOS


class TestCreatePipelineSchedule(unittest.TestCase):
    """Make sure we talk to GitLab correctly when setting up new schedules."""

    @patch.object(mod, "requests")
    def test_create_schedule_success(self, mock_requests):
        """Happy path: no schedule exists yet, so we create one and get its ID back."""
        mock_requests.get.return_value = MagicMock(
            status_code=200, json=MagicMock(return_value=[])
        )
        mock_requests.post.return_value = MagicMock(
            status_code=201,
            json=MagicMock(return_value={"id": 12345, "description": "test"}),
        )
        result = create_pipeline_schedule(
            token="fake-token",
            project_path="Northern.tech/Mender/mender-server",
            ref="4.2.x",
            description="Integration mender-server:4.2.x",
            cron="0 1 * * *",
            cron_timezone="UTC",
            variables={},
            dry_run=False,
        )
        self.assertEqual(result, 12345)
        mock_requests.post.assert_called_once()

    @patch.object(mod, "requests")
    def test_create_schedule_already_exists(self, mock_requests):
        """If the branch already has a schedule, just reuse it — don't create a duplicate."""
        mock_requests.get.return_value = MagicMock(
            status_code=200,
            json=MagicMock(
                return_value=[{"id": 99, "ref": "4.2.x", "description": "existing"}]
            ),
        )
        result = create_pipeline_schedule(
            token="fake-token",
            project_path="Northern.tech/Mender/mender-server",
            ref="4.2.x",
            description="Integration mender-server:4.2.x",
            cron="0 1 * * *",
            cron_timezone="UTC",
            variables={},
            dry_run=False,
        )
        self.assertEqual(result, 99)


class TestDeletePipelineSchedules(unittest.TestCase):
    """Make sure we only delete schedules for the exact version we're retiring."""

    @patch.object(mod, "requests")
    def test_delete_schedules_for_version(self, mock_requests):
        """Should remove the 4.1.x schedule but leave the 'main' one alone."""
        mock_requests.get.return_value = MagicMock(
            status_code=200,
            json=MagicMock(
                return_value=[
                    {"id": 100, "ref": "4.1.x", "description": "Integration mender-server:4.1.x"},
                    {"id": 200, "ref": "main", "description": "mender-server main"},
                ]
            ),
        )
        mock_requests.delete.return_value = MagicMock(status_code=204)
        deleted = delete_pipeline_schedules_for_version(
            token="fake-token",
            project_path="Northern.tech/Mender/mender-server",
            version="4.1.x",
            dry_run=False,
        )
        self.assertEqual(deleted, [{"id": 100, "ref": "4.1.x", "description": "Integration mender-server:4.1.x"}])
        mock_requests.delete.assert_called_once()


SAMPLE_NIGHTLIES_JS = """\
export const pipelines = [
  {
    name: 'Integration mender-server:main',
    projectPath: 'Northern.tech/Mender/integration',
    pipelineScheduleId: 2676039
  },
  {
    name: 'Integration mender-server:4.0.x',
    projectPath: 'Northern.tech/Mender/integration',
    pipelineScheduleId: 2766723
  },
  {
    name: 'Mender Client Acceptance Tests',
    projectPath: 'Northern.tech/Mender/mender-qa',
    pipelineScheduleId: 30585
  },
  {
    name: 'mender-server-enterprise',
    projectPath: 'Northern.tech/Mender/mender-server-enterprise',
    pipelineScheduleId: 2738797
  },
  {
    name: 'mender-server',
    projectPath: 'Northern.tech/Mender/mender-server',
    pipelineScheduleId: 2738796
  },
  {
    name: 'mender-gateway:master (w/ client latest)',
    projectPath: 'Northern.tech/Mender/mender-gateway',
    pipelineScheduleId: 2874910
  }
];
"""


class TestAddEntriesToNightliesJs(unittest.TestCase):
    """Verify we can inject new pipeline entries into the right spots in nightlies.js."""

    def test_add_entries(self):
        """Each new entry should land right after its repo's anchor entry."""
        schedule_ids = {
            "integration": 5555555,
            "mender-server-enterprise": 6666666,
            "mender-server": 7777777,
        }
        result = add_entries_to_nightlies_js(SAMPLE_NIGHTLIES_JS, "4.1.x", schedule_ids)

        self.assertIn("Full integration mender-server:4.1.x", result)
        self.assertIn("pipelineScheduleId: 5555555", result)
        self.assertIn("Integration mender-server-enterprise:4.1.x", result)
        self.assertIn("pipelineScheduleId: 6666666", result)
        self.assertIn("Integration mender-server:4.1.x", result)
        self.assertIn("pipelineScheduleId: 7777777", result)

        # Check insertion order
        idx_40x = result.index("pipelineScheduleId: 2766723")
        idx_new_int = result.index("pipelineScheduleId: 5555555")
        self.assertGreater(idx_new_int, idx_40x)

        idx_ent_main = result.index("pipelineScheduleId: 2738797")
        idx_new_ent = result.index("pipelineScheduleId: 6666666")
        self.assertGreater(idx_new_ent, idx_ent_main)

        idx_ms_main = result.index("pipelineScheduleId: 2738796")
        idx_new_ms = result.index("pipelineScheduleId: 7777777")
        self.assertGreater(idx_new_ms, idx_ms_main)


class TestRemoveEntriesFromNightliesJs(unittest.TestCase):
    """Verify we can cleanly rip out entries for a retired version."""

    def test_remove_entries(self):
        """Add entries, remove them, and confirm the file looks like it did before."""
        schedule_ids = {
            "integration": 5555555,
            "mender-server-enterprise": 6666666,
            "mender-server": 7777777,
        }
        with_entries = add_entries_to_nightlies_js(SAMPLE_NIGHTLIES_JS, "4.1.x", schedule_ids)
        result = remove_entries_from_nightlies_js(with_entries, "4.1.x")

        self.assertNotIn("4.1.x", result)
        self.assertIn("pipelineScheduleId: 2676039", result)
        self.assertIn("pipelineScheduleId: 2738797", result)
        self.assertIn("pipelineScheduleId: 2738796", result)


SAMPLE_BUILD_STATUS_JS = """\
const repos = [
  { repo: 'mender-artifact', staging: true, isExecutable: true, isProduct: true, area: areas.client },
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
];
"""


class TestAddVersionToBuildStatusJs(unittest.TestCase):
    """Verify we can register a new version in the build-status page."""

    def test_add_version(self):
        """Both mender-server and enterprise should pick up the new branch."""
        result = add_version_to_build_status_js(SAMPLE_BUILD_STATUS_JS, "4.1.x")
        self.assertIn("supportedBranches: ['4.0.x', '4.1.x']", result)
        self.assertEqual(result.count("'4.1.x'"), 2)

    def test_add_version_idempotent(self):
        """Running it twice shouldn't produce '4.1.x', '4.1.x' — once is enough."""
        result = add_version_to_build_status_js(SAMPLE_BUILD_STATUS_JS, "4.1.x")
        result2 = add_version_to_build_status_js(result, "4.1.x")
        self.assertEqual(result, result2)


class TestRemoveVersionFromBuildStatusJs(unittest.TestCase):
    """Verify we can unlist a retired version from the build-status page."""

    def test_remove_version(self):
        """After removal, 4.1.x should be gone but 4.0.x still intact."""
        with_version = add_version_to_build_status_js(SAMPLE_BUILD_STATUS_JS, "4.1.x")
        result = remove_version_from_build_status_js(with_version, "4.1.x")
        self.assertNotIn("4.1.x", result)
        self.assertIn("'4.0.x'", result)


class TestGitHelpers(unittest.TestCase):
    """Sanity-check the branch and commit message generators."""

    def test_branch_name_with_ticket(self):
        """Ticket prefix should appear before the branch slug."""
        result = generate_branch_name("4.2.x", "QA-1600")
        self.assertEqual(result, "QA-1600/add-4.2.x-nightly-pipelines")

    def test_branch_name_without_ticket(self):
        """No ticket? Just the plain branch name, no slash prefix."""
        result = generate_branch_name("4.2.x", None)
        self.assertEqual(result, "add-4.2.x-nightly-pipelines")

    def test_commit_message(self):
        """Commit message should follow conventional format and include the ticket."""
        msg = generate_commit_message("4.2.x", "QA-1600")
        self.assertIn("feat(nightlies):", msg)
        self.assertIn("4.2.x", msg)
        self.assertIn("Ticket: QA-1600", msg)

    def test_commit_message_no_ticket(self):
        """Without a ticket the footer should simply be absent."""
        msg = generate_commit_message("4.2.x", None)
        self.assertNotIn("Ticket:", msg)


class TestArgParsing(unittest.TestCase):
    """Make sure the CLI parses flags correctly and applies sensible defaults."""

    def test_minimal_args(self):
        """Just --version should be enough to get going."""
        args = parse_args(["--version", "4.2.x"])
        self.assertEqual(args.version, "4.2.x")
        self.assertIsNone(args.remove_version)
        self.assertFalse(args.dry_run)

    def test_full_args(self):
        """Every flag provided — make sure nothing gets lost or mixed up."""
        args = parse_args([
            "--version", "4.2.x",
            "--remove-version", "4.1.x",
            "--cron-mender-server", "0 3 * * *",
            "--cron-mender-server-enterprise", "0 4 * * *",
            "--cron-integration", "0 5 * * *",
            "--timezone", "Europe/Oslo",
            "--vars-mender-server", "KEY1=val1,KEY2=val2",
            "--ticket", "QA-1600",
            "--dry-run",
        ])
        self.assertEqual(args.remove_version, "4.1.x")
        self.assertEqual(args.cron_mender_server, "0 3 * * *")
        self.assertEqual(args.timezone, "Europe/Oslo")
        self.assertTrue(args.dry_run)

    def test_parse_variables(self):
        """Comma-separated KEY=val pairs should become a clean dict."""
        result = parse_variables("KEY1=val1,KEY2=val2")
        self.assertEqual(result, {"KEY1": "val1", "KEY2": "val2"})

    def test_parse_variables_none(self):
        """No variables? No problem — just give us an empty dict."""
        result = parse_variables(None)
        self.assertEqual(result, {})


if __name__ == "__main__":
    unittest.main()
