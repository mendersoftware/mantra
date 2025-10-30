SHELL := /bin/bash

# used to check what platform we're on, to see if we should use a vm for docker
UNAME := $(shell uname)
# try xdg-open on linux
OPEN := open

# the image and container are both named this
DOCKER_TAG := mantra-api
DOCKER_DB_TAG := mantra-db
DOCKER_UI_TAG := mantra-ui

help:
	@echo 'Commands:'
	@echo '  start                      - start $(DOCKER_TAG), running locally'
	@echo '  test                       - run tests (you must first write tetra-test.conf)'
	@echo '  docs                       - build the docs and start a local server to view them'
	@echo '  deploy-docs                - build and deploy docs to github pages'
	@echo 'Docker commands:'
	@echo '  docker-build               - build all docker images for a dev environment'
	@echo '  docker-deploy              - deploy docker composition locally'
	@echo '  docker-deploy-development  - deploy docker composition locally for a dev environment'
	@echo '  docker-db                  - run the postgres docker container in background ($(DOCKER_DB_TAG))'
	@echo '  docker-logs                - follow the logs from all containers'
	@echo '  docker-down                - stop and remove the containers'
	@echo '  docker-port                - display the real <ip>:<port> for different containers'
	@echo '  docker-postgres-shell      - start the postgres shell in your container'

start:
	gunicorn --reload -t 120 --bind 127.0.0.1:7374 --access-logfile - tetra.app:application

test:
	py.test -v ./tests

docs:
	mkdocs serve

# running with tox resulted in "Unknown committed ..." on the gh-pgaes branch
deploy-docs:
	mkdocs gh-deploy -c

docker-build:
	docker compose -f docker-compose.yml build

docker-deploy: docker-db
	sleep 5
	docker compose -f docker-compose.yml up --no-recreate -d api ui gateway

docker-deploy-development: docker-db
	sleep 5
	docker compose -f docker-compose.yml -f development.yml up --no-recreate -d api ui gateway

docker-db:
	docker compose -f docker-compose.yml up -d db

docker-logs:
	docker compose -f docker-compose.yml logs -f

docker-down:
	docker compose -f docker-compose.yml down

docker-port:
	@echo API=$(shell docker port $(DOCKER_TAG) 7374)
	@echo DB=$(shell docker port $(DOCKER_DB_TAG) 5432)
	@echo UI=$(shell docker port $(DOCKER_UI_TAG) 80)

docker-postgres-shell:
	docker exec -it $(DOCKER_DB_TAG) \
		bash -c 'PGPASSWORD=password psql -U postgres'

.PHONY: start
.PHONY: test
.PHONY: docs
.PHONY: deploy-docs
.PHONY: docker-build
.PHONY: docker-deploy
.PHONY: docker-deploy-development
.PHONY: docker-db
.PHONY: docker-logs
.PHONY: docker-port
.PHONY: docker-postgres-shell
