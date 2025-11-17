#!/usr/bin/env python3

import os
import logging


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tetrautils")
logger.setLevel(logging.INFO)


TEST_RESULTS_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "test_results"
)

MENDER_QA_TEST_SUITES = [
    {
        "id": 1,
        "name": "test:acceptance:qemux86_64:uefi_grub",
        "job": "test:acceptance:qemux86_64:uefi_grub",
        "results_file": "results_accep_qemux86_64_uefi_grub",
    },
    {
        "id": 2,
        "name": "test:acceptance:vexpress_qemu",
        "job": "test:acceptance:vexpress_qemu",
        "results_file": "results_accep_vexpress_qemu",
    },
    {
        "id": 3,
        "name": "test:acceptance:qemux86_64:bios_grub",
        "job": "test:acceptance:qemux86_64:bios_grub",
        "results_file": "results_accep_qemux86_64_bios_grub",
    },
    {
        "id": 4,
        "name": "test:acceptance:qemux86_64:bios_grub_gpt",
        "job": "test:acceptance:qemux86_64:bios_grub_gpt",
        "results_file": "results_accep_qemux86_64_bios_grub_gpt",
    },
    {
        "id": 5,
        "name": "test:acceptance:vexpress_qemu:uboot_uefi_grub",
        "job": "test:acceptance:vexpress_qemu:uboot_uefi_grub",
        "results_file": "results_accep_vexpress_qemu_uboot_uefi_grub",
    },
    {
        "id": 6,
        "name": "test:acceptance:vexpress_qemu_flash",
        "job": "test:acceptance:vexpress_qemu_flash",
        "results_file": "results_accep_vexpress_qemu_flash",
    },
    {
        "id": 7,
        "name": "test:backend-integration:open",
        "job": "test:backend-integration:open_source",
        "results_file": "results_backend_integration_open",
    },
    {
        "id": 8,
        "name": "test:backend-integration:enterprise",
        "job": "test:backend-integration:enterprise",
        "results_file": "results_backend_integration_enterprise",
    },
    {
        "id": 9,
        "name": "test:integration:source_client",
        "job": "test:integration:source_client:open_source",
        "results_file": "results_full_integration",
    },
    {
        "id": 10,
        "name": "test:integration:source_client:enterprise",
        "job": "test:integration:source_client:enterprise",
        "results_file": "results_full_integration",
    },
    {
        "id": 12,
        "name": "test:orchestrator-integration",
        "job": "test:orchestrator-integration",
        "results_file": "results_orchestrator_integration",
    },
]

_TETRA_API_HOST = os.getenv("TETRA_API_HOST", "http://localhost")
_TETRA_API_BASE_URL = "{}/api/".format(_TETRA_API_HOST)

TETRA_API_PROJECTS_URL = _TETRA_API_BASE_URL + "projects"
TETRA_API_BUILDS_URL_FMT = _TETRA_API_BASE_URL + "projects/{project_id}/builds"
TETRA_API_RESULTS_URL_FMT = (
    _TETRA_API_BASE_URL + "projects/{project_id}/builds/{build_id}/results"
)


def get_tetra_credentials():
    user = os.getenv("TETRA_USER")
    password = os.getenv("TETRA_PASSWORD")
    if user is None or password is None:
        logger.warning("TETRA_USER or TETRA_PASSWORD not found in user environment")
    return user, password
