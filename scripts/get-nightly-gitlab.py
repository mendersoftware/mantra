#!/usr/bin/env python3

"""Get integration test results for recent nightlies

For the last 14 days, get the xml results available in GitLab"""

import requests
import os
import sys
from datetime import timedelta, date

from common import logger
from common import TEST_RESULTS_DIR
from common import MENDER_QA_TEST_SUITES

# Get token from env
token = os.getenv("GITLAB_TOKEN")
if token is None:
    logger.error("GITLAB_TOKEN not found in user environment")
    sys.exit(1)

base_url = "https://gitlab.com/api/v4/projects/12501706/"
pipelines_api = base_url + "pipelines/"
jobs_api = base_url + "jobs/"
artifacts_api_fmt = base_url + "jobs/{job_id}/artifacts/{artifact_filename}"


def iterate_dates(start_date, total_days, delta_days=-1):
    for delta in range(0, total_days, delta_days):
        yield start_date + timedelta(days=delta)


def iterate_nightlies(start_date, total_days):
    # Filter with user that triggers master and nightlies:
    parameters_base = "username=mender-test-bot"

    for single_date in iterate_dates(start_date, total_days):
        single_date_str = single_date.strftime("%Y-%m-%d")
        logger.info("Looking for nightly " + single_date_str)
        for end_hour in range(2, 12):
            parameters = (
                parameters_base
                + "&updated_after={}-{:02}-{:02}T01:00:00Z".format(
                    single_date.year, single_date.month, single_date.day
                )
            )
            parameters += "&updated_before={}-{:02}-{:02}T:{:02}:00:00Z".format(
                single_date.year, single_date.month, single_date.day, end_hour
            )
            url = "{url}?{params}".format(url=pipelines_api, params=parameters)
            logger.debug("Fetching URL: " + url)
            r = requests.get(url, headers={"PRIVATE-TOKEN": token})
            j = r.json()
            logger.debug("Got JSON: " + str(j))
            if len(j) > 0:
                nightly_id = j[0]["id"]
                logger.info(
                    "Found nightly " + str(nightly_id) + " for " + single_date_str
                )
                yield single_date_str, j[0]["id"]
                break
        else:
            logger.error("Could not find nightly for " + single_date_str)


def fetch_and_save_nightlies(start_date=date.today(), total_days=-14):
    for date_str, nightly_id in iterate_nightlies(start_date, total_days):
        url = pipelines_api + str(nightly_id) + "/jobs?per_page=100"
        logger.debug("Fetching URL: " + url)
        r = requests.get(url, headers={"PRIVATE-TOKEN": token})
        if r.status_code == 404:
            logger.error("Error fetching %s. Skipping" % url)
            continue

        j = r.json()
        logger.debug("Got JSON: " + str(j))

        for project in MENDER_QA_TEST_SUITES:
            test_job = [jj["id"] for jj in j if jj["name"] == project["job"]]
            if len(test_job) == 0:
                # RPi is not build by default
                if project["job"] == "test_accep_raspberrypi3":
                    logger_func = logger.warning
                else:
                    logger_func = logger.error
                logger_func("Cannot find %s in job list" % project["job"])
                continue

            test_job = test_job[0]
            logger.info("Fetching XML results for %s" % project["job"])
            url = artifacts_api_fmt.format(
                job_id=test_job, artifact_filename=project["results_file"] + ".xml"
            )
            logger.debug("Fetching URL: " + url)
            r = requests.get(url, headers={"PRIVATE-TOKEN": token})

            if r.status_code == 404:
                # BBB and RPi are not tested
                if project["job"] in [
                    "test_accep_beagleboneblack",
                    "test_accep_raspberrypi3",
                ]:
                    logger_func = logger.warning
                else:
                    logger_func = logger.error
                logger_func(
                    "Cannot get results file %s from %s "
                    % (project["results_file"], project["job"])
                )
                continue

            filename = os.path.join(
                TEST_RESULTS_DIR,
                str(project["id"])
                + "-"
                + project["results_file"]
                + "@"
                + date_str
                + ".xml",
            )
            if not os.path.exists(filename):
                logger.info("Saving report in " + filename)
                with open(filename, "wb") as fd:
                    fd.write(r.content)
            else:
                logger.warning(
                    "Report " + os.path.basename(filename) + " already exists, skipping"
                )


if __name__ == "__main__":
    fetch_and_save_nightlies()
