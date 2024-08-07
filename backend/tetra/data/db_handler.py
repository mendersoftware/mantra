"""
Copyright 2016 Rackspace

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
"""

import logging

from tetra.config import cfg
from tetra.data.postgres_client import PostgresClient

LOG = logging.getLogger(__name__)
conf = cfg.CONF

handlers = {"postgresql": PostgresClient()}

_db_handler = handlers.get(conf.sqlalchemy.engine)

_db_handler.connect()


def get_handler():
    return _db_handler
