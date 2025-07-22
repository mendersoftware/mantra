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

import time

from sqlalchemy import desc, Boolean
from sqlalchemy.sql import func, select, and_, or_, cast

from tetra.data import sql
from tetra.data.db_handler import get_handler
from tetra.data.models.base import BaseModel, truncate
from tetra.data.models.build import Build
from tetra.data.models.result_metadata import ResultMetadata


class Result(BaseModel):

    TABLE = sql.results_table

    def __init__(
        self,
        test_name,
        result,
        project_id,
        build_id,
        id=None,
        timestamp=None,
        result_message=None,
        tags=None,
        false_positive=False,
    ):
        if id:
            self.id = int(id)

        self.test_name = truncate(test_name, self.TABLE.c.test_name.type.length)
        self.project_id = int(project_id)
        self.build_id = int(build_id)
        self.timestamp = int(timestamp or time.time())
        self.result = truncate(result, self.TABLE.c.result.type.length)
        self.result_message = result_message
        self.tags = dict(tags or {})
        if false_positive:
            self.tags["false_positive"] = True

    @classmethod
    def from_junit_xml_test_case(cls, case, project_id, build_id):
        if case.success:
            result_type = "passed"
        elif case.skipped:
            result_type = "skipped"
        elif case.failed:
            result_type = "failed"
        elif case.errored:
            result_type = "error"
        else:
            result_type = "unknown"

        return Result(
            test_name=case.id(),
            result=result_type,
            project_id=project_id,
            build_id=build_id,
            result_message=case.trace,
        )

    @classmethod
    def update(cls, resource, handler=None):
        """
        Persist changes to this Result instance back to the database.
        """
        handler = handler or get_handler()
        updated = handler.update(resource=resource, resource_id=resource.id)
        return updated

    @classmethod
    def get_all(
        cls,
        handler=None,
        limit=None,
        offset=None,
        project_id=None,
        test_name=None,
        build_id=None,
        timestamp=None,
        result=None,
        result_message=None,
        **tag_filters,
    ):
        handler = handler or get_handler()
        and_clause = cls._and_clause(
            project_id=project_id,
            test_name=test_name,
            build_id=build_id,
            timestamp=timestamp,
            result=result,
            result_message=result_message,
        )

        if tag_filters:
            and_clause &= cls.TABLE.c.tags.contains(tag_filters)

        query = cls._get_all_query(and_clause, limit=limit, offset=offset)
        results = handler.get_all(resource_class=cls, query=query)

        # This `and_clause` should not have the limit/offset included. We want
        # to run stats on the whole result, not just the first page.
        metadata = cls._get_results_metadata(and_clause, handler=handler)

        results_dict = {
            "results": results,
            "metadata": metadata.to_dict(),
        }
        return results_dict

    @classmethod
    def get_last_count_by_status(cls, handler=None, limit=None, offset=None, **kwargs):
        handler = handler or get_handler()
        if (
            kwargs
            and "project_id" in kwargs
            and "build_name" in kwargs
            and "status" in kwargs
            and "count" in kwargs
        ):

            # select * from results
            # where status = kwargs['status']
            # and build_id in (
            #   select build_id from build
            #   where build_name = kwargs['build_name']
            #   and project_id = kwargs['project_id']
            #   order by build_id desc
            #   limit kwargs['count']
            # )
            query_by_build_name = (
                select(Build.TABLE.c.id)
                .select_from(Build.TABLE)
                .where(
                    and_(
                        Build.TABLE.c.project_id == kwargs["project_id"],
                        Build.TABLE.c.name == kwargs["build_name"],
                    )
                )
                .order_by(desc(Build.TABLE.c.id))
                .limit(kwargs["count"])
            )

            last_count_by_status_query = cls.TABLE.select().where(
                and_(
                    cls.TABLE.c.result == kwargs["status"],
                    cls.TABLE.c.build_id.in_(query_by_build_name),
                )
            )

            return handler.get_all(
                resource_class=cls,
                query=last_count_by_status_query,
                limit=limit,
                offset=offset,
            )
        else:
            return []

    @classmethod
    def get_last_count_by_test_name(
        cls, handler=None, limit=None, offset=None, **kwargs
    ):
        handler = handler or get_handler()
        if (
            kwargs
            and "project_id" in kwargs
            and "test_name" in kwargs
            and "count" in kwargs
        ):

            # select * from results
            # where build_id in (
            #   select build_id from build
            #   where test_name = kwargs['test_name']
            #   and project_id = kwargs['project_id']
            #   order by build_id desc
            #   limit kwargs['count']
            # )
            query_by_build_name = (
                select(Build.TABLE.c.id)
                .select_from(Build.TABLE)
                .where(
                    Build.TABLE.c.project_id == kwargs["project_id"],
                )
                .order_by(desc(Build.TABLE.c.id))
                .limit(kwargs["count"])
            )

            last_count_by_status_query = cls.TABLE.select().where(
                and_(
                    cls.TABLE.c.test_name == kwargs["test_name"],
                    cls.TABLE.c.build_id.in_(query_by_build_name),
                )
            )

            return handler.get_all(
                resource_class=cls,
                query=last_count_by_status_query,
                limit=limit,
                offset=offset,
            )
        else:
            return []

    @classmethod
    def create_many(cls, resources, handler=None, **kwargs):
        handler = handler or get_handler()
        super(cls, Result).create_many(resources, handler=handler)

        metadata = ResultMetadata.from_results_list(resources)

        results_dict = {
            "metadata": metadata.to_dict(),
        }
        return results_dict

    @classmethod
    def _get_results_metadata(cls, and_clause, handler=None):
        handler = handler or get_handler()

        query = (
            select(cls.TABLE.c.result, func.count(cls.TABLE.c.result).label("count"))
            .where(and_clause)
            .group_by(cls.TABLE.c.result)
        )
        count_results = handler.get_all(resource_class=Result, query=query)

        return ResultMetadata.from_database_counts(count_results)

    @classmethod
    def get_test_stats(
        cls,
        handler=None,
        project=None,
        type="nightly",
        test_name=None,
        status=["failed", "error"],
        since_time=0,
    ):
        """Returns the spurious failures in our nightlies for the given time
        interval [time_since, now]

        Also can filter on the given:

        * test_name
        * Statuses

        statement = text(
            "SELECT test_name, count(result) "
            "FROM (
                SELECT name,
                timestamp,
                test_name,
                result FROM results JOIN builds ON results.build_id = builds.id
            ) as tmp "
                "WHERE result = 'failed' "
                "OR result = 'error' "
                "AND name like ':type%' "
                "AND timestamp > :since_time "
                "GROUP BY test_name "
                "ORDER BY count(result) DESC"
        )

        """

        handler = handler or get_handler()

        results_table = cls.TABLE
        ands = [
            or_(
                cast(results_table.c.tags['false_positive'].astext, Boolean) == False,
                results_table.c.tags['false_positive'].is_(None)
            ),
            Build.TABLE.c.name.like(f"{type}%"),
            results_table.c.timestamp > since_time,
        ]
        if test_name:
            ands.append(results_table.c.test_name == test_name)
        if project:
            try:
                project_id = int(project)
            except ValueError:
                project_obj = Project.get_all(handler, name=project)
                project_id = project_obj[0].id if project_obj else None
            if project_id:
                ands.append(results_table.c.project_id == project_id)

        orm_statement = (
            select(
                results_table.c.test_name,
                func.count(results_table.c.result).label("count"),
                results_table.c.project_id,
                results_table.c.tags["false_positive"].astext,
            )
            .select_from(results_table.join(Build.TABLE))
            .where(
                and_(
                    or_(
                        results_table.c.result.in_(status),
                    ),
                    *ands,
                )
            )
            .group_by(
                results_table.c.test_name,
                results_table.c.project_id,
                results_table.c.tags["false_positive"].astext,
            )
            .order_by(func.count(results_table.c.result).desc())
        )

        return handler.get_all(resource_class=cls, query=orm_statement, limit=100)
