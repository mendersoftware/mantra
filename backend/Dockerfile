FROM python:3.13-alpine
ENV PYTHONUNBUFFERED 1
WORKDIR /tetra
RUN apk add --no-cache postgresql-libs && \
  apk add --no-cache --virtual .build-deps gcc musl-dev postgresql-dev
COPY requirements.txt setup.py tetra.conf ./
RUN pip install -r requirements.txt --no-cache-dir && \
  apk --purge del .build-deps
COPY ./tetra ./tetra/
RUN pip install .
CMD gunicorn -t 120 --bind 0.0.0.0:7374 --access-logfile - tetra.app:application
