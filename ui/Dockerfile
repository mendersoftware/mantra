
FROM node:25.5-alpine AS builder
WORKDIR /work
COPY package.json package-lock.json ./
RUN npm ci
COPY . ./
RUN --mount=type=secret,id=aws_access_key_id \
    --mount=type=secret,id=aws_secret_access_key \
    --mount=type=secret,id=gitlab_token \
    --mount=type=secret,id=github_token \
    export AWS_ACCESS_KEY_ID=$(cat /run/secrets/aws_access_key_id 2>/dev/null || echo "") && \
    export AWS_SECRET_ACCESS_KEY=$(cat /run/secrets/aws_secret_access_key 2>/dev/null || echo "") && \
    export GITLAB_TOKEN=$(cat /run/secrets/gitlab_token 2>/dev/null || echo "") && \
    export GITHUB_TOKEN=$(cat /run/secrets/github_token 2>/dev/null || echo "") && \
    npm run build

FROM builder AS development
EXPOSE 80
ENV PORT=80
ENV NODE_ENV development
CMD npm run autobuild

FROM nginx:stable-alpine AS production
COPY --from=builder /work/out /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN chown nginx:nginx -R /usr/share/nginx/html
