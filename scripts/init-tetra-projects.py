#!/usr/bin/env python3

"""Creates a project for every test suite in Mender QA"""

import requests
from requests.auth import HTTPBasicAuth
import sys
import json

from common import logger
from common import MENDER_QA_TEST_SUITES
from common import TETRA_API_PROJECTS_URL
from common import get_tetra_credentials


# This script requires TETRA_USER and TETRA_PASSWORD to be set in shell
user, password = get_tetra_credentials()

# Our Mantra is protected by Google auth. Right now only CI facing API is using
# normal base_auth. Using "/api/ci/projects" instead of default "/api/projects"
# allows to authenticate via base_auth. This is a reason for overwrite here.
TETRA_API_PROJECTS_URL="https://qastatus.mender.io/api/ci/projects"

logger.info("Calling API endpoint: %s" % TETRA_API_PROJECTS_URL)
r = requests.get(TETRA_API_PROJECTS_URL, auth=HTTPBasicAuth(user, password))
if not r.ok:
    logger.error("Error(%d) %s" % (r.status_code, r.text))
    sys.exit(1)

try:
    j = r.json()
except Exception as e:
    # Extra debug for situation when converting to JSON will fail.
    # This may be caused when API is protected by OAuth etc
    logger.debug(r.status_code)
    logger.debug("API URL:", TETRA_API_PROJECTS_URL)
    logger.debug("Final URL:", r.request.url)
    logger.debug("Method:", r.request.method)
    logger.debug("Headers:", r.request.headers)
    logger.error("Exception:", e)
    sys.exit(0)

# Adding existing project will create a duplicate with a next ID assigned.
# That is the reason we are failing here as it shall be called once - the first
# time Mantra has been set up.
if len(j) > 0:
    logger.warning("The following projects already exist:")
    logger.warning(j)
    logger.warning("Exiting")
    sys.exit(0)

# Make sure to create only projects keys which does not exists yet.
# Mantra is not checking this, it will get the next free ID and assign it
# to the presented key.
for project in MENDER_QA_TEST_SUITES:
    logger.info("Creating project %s" % project["name"])

    # Uncomment to add a new project semi-manually
    #if project["name"] == "XXX":
    #    logger.info("Adding a new project")
    #else:
    #    logger.info("Skipping existing project")
    #    continue

    r = requests.post(
        TETRA_API_PROJECTS_URL,
        auth=HTTPBasicAuth(user, password),
        data=json.dumps({"name": project["name"]}),
    )
    if not r.ok:
        logger.error("Error(%d) %s" % (r.status_code, r.text))
        sys.exit(1)
    j = r.json()

    logger.debug("Got JSON: %s" % str(j))
    if j["id"] != project["id"]:
        logger.error("Expected id %d, got %d" % (project["id"], j["id"]))
        sys.exit(1)
    logger.info("Created project: %s" % j)
