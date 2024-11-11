
FROM node:23-alpine AS builder
ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_ACCESS_KEY 
ARG GITLAB_TOKEN
ARG GITHUB_TOKEN
ENV AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
ENV AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
ENV GITLAB_TOKEN=$GITLAB_TOKEN
ENV GITHUB_TOKEN=$GITHUB_TOKEN
WORKDIR /work
COPY package.json package-lock.json ./
RUN npm ci
COPY . ./
RUN npm run build

FROM builder AS development
EXPOSE 80
ENV PORT=80
ENV NODE_ENV development
CMD npm run autobuild

FROM nginx:stable-alpine as production
COPY --from=builder /work/out /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN chown nginx:nginx -R /usr/share/nginx/html
