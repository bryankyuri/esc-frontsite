# syntax=docker/dockerfile:1

##########  build the Vite/React app  ##########
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
# Same-origin API by default: Nginx (below) proxies /api -> the api service, so
# the app calls "/api/..." with no CORS. Override to an absolute URL to point the
# frontend at a separately-hosted API.
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN yarn build

##########  serve with Nginx  ##########
FROM nginx:alpine AS serve
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
