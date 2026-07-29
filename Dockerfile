# Stage 1: Server build
FROM node:22-alpine AS server

RUN apk -U upgrade \
  && apk add build-base python3 --no-cache \
  && npm install -g pnpm@latest

WORKDIR /app

COPY server .

RUN pnpm install \
  && pnpm run build \
  && pnpm prune --prod

# Stage 2: Client build
FROM node:22-alpine AS client

RUN npm install -g pnpm@latest

WORKDIR /app

ARG VITE_STYLE_PRESET=original
ENV VITE_STYLE_PRESET=$VITE_STYLE_PRESET

COPY client .

RUN pnpm install \
  && INDEX_FORMAT=ejs DISABLE_ESLINT_PLUGIN=true pnpm run build

# Stage 3: Final image (этот этап остаётся без изменений)
FROM node:22-alpine

RUN apk -U upgrade \
  && apk add bash python3 squid --no-cache

USER node
WORKDIR /app

COPY --chown=node:node LICENSE.md .
COPY --chown=node:node ["LICENSES/PLANKA Community License DE.md", "LICENSE_DE.md"]

COPY --from=server --chown=node:node /app/node_modules node_modules
COPY --from=server --chown=node:node /app/dist .

COPY --from=client --chown=node:node /app/dist public

RUN python3 -m venv .venv \
  && .venv/bin/pip3 install --upgrade pip \
  && .venv/bin/pip3 install -r requirements.txt --no-cache-dir \
  && mv .env.sample .env \
  && mv public/index.ejs views \
  && pnpm config set update-notifier false

VOLUME /app/data
EXPOSE 1337

HEALTHCHECK --interval=10s --timeout=2s --start-period=15s \
  CMD node ./healthcheck.js

CMD ["./start.sh"]
