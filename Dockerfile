# Stage 1: Server build
FROM node:22-alpine AS server

RUN apk -U upgrade \
  && apk add build-base python3 --no-cache \
  && npm install -g pnpm@11.18.0

WORKDIR /app

COPY server/package.json server/pnpm-workspace.yaml server/.npmrc server/requirements.txt server/setup-python.js ./
COPY server/patches patches

RUN --mount=type=cache,id=pnpm-server,target=/root/.local/share/pnpm/store \
  pnpm install

COPY server .

RUN pnpm run build \
  && pnpm prune --prod --ignore-scripts

# Stage 2: Client build
FROM node:22-alpine AS client

RUN npm install -g pnpm@11.18.0

WORKDIR /app

ARG VITE_STYLE_PRESET=original
ENV VITE_STYLE_PRESET=$VITE_STYLE_PRESET

COPY client/package.json client/pnpm-workspace.yaml client/.npmrc ./
COPY client/patches patches

RUN --mount=type=cache,id=pnpm-client,target=/root/.local/share/pnpm/store \
  pnpm install

COPY client .

RUN INDEX_FORMAT=ejs DISABLE_ESLINT_PLUGIN=true pnpm run build

# Stage 3: Final image
FROM node:22-alpine

RUN apk -U upgrade \
  && apk add bash python3 squid --no-cache

USER node
WORKDIR /app

COPY --chown=node:node LICENSE.md .
COPY --chown=node:node ["LICENSES/PLANKA Community License DE.md", "LICENSE_DE.md"]

COPY --from=server --chown=node:node /app/node_modules node_modules
COPY --from=server --chown=node:node /app/dist .
COPY --from=server --chown=node:node /app/.venv .venv

COPY --from=client --chown=node:node /app/dist public

RUN mv .env.sample .env \
  && mv public/index.ejs views

VOLUME /app/data
EXPOSE 1337

HEALTHCHECK --interval=10s --timeout=2s --start-period=15s \
  CMD node ./healthcheck.js

CMD ["./start.sh"]
