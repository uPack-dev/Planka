# Agent Instructions

## Development Startup

- Run the development stack only through Docker Compose.
- Do not start dev services with local `npm start`, `pnpm start`, direct `vite`, or direct `nodemon` outside Docker, as PostgreSQL is isolated inside the Compose network.
- Use this command from the repository root:

```bash
docker compose -f docker-compose-dev.yml up -d --build
```

## Useful Compose Commands

- Check running services:

```bash
docker compose -f docker-compose-dev.yml ps
```

- Follow logs:

```bash
docker compose -f docker-compose-dev.yml logs -f planka-client planka-server postgres
```

- Stop the stack without deleting data:

```bash
docker compose -f docker-compose-dev.yml down
```

- Do not run `docker compose down -v` unless the user explicitly asks to remove the database volume.

## Local Dev URLs & Credentials

- Client: `http://localhost:3000`
- Server API: `http://localhost:1337` (or `1338` in legacy configs)
- Postgres is only exposed inside the Compose network.
- Demo login: username `demo`, email `demo@demo.demo`, password `demo`.

## Startup Verification

After starting the stack, verify the app through the Compose-published ports:

```bash
# Note: If terms acceptance is required, update user_account terms_signature sha256 in postgres first:
TERMS_SIG=$(docker exec planka-planka-server-1 sha256sum terms/_template/en-US.md | awk '{print $1}')
docker exec planka-postgres-1 psql -U postgres -d planka -c "UPDATE user_account SET terms_signature = '$TERMS_SIG';"

curl -sS -D - http://localhost:3000/ -o /tmp/planka-client-index.html
curl -sS -D - http://localhost:3000/api/bootstrap -o /tmp/planka-bootstrap.json
curl -sS -D - -H 'Content-Type: application/json' \
  -d '{"emailOrUsername":"demo","password":"demo"}' \
  http://localhost:3000/api/access-tokens \
  -o /tmp/planka-login.json
```

Expected results:

- `http://localhost:3000/` returns `200 OK`.
- `http://localhost:3000/api/bootstrap` returns `200 OK`.
- Login through `http://localhost:3000/api/access-tokens` returns `200 OK` with a JSON `item` access token.

The server root at `http://localhost:1338/` is not a useful health check in dev. It may return a Sails view-rendering error because the dev client is served separately by Vite.

## PNPM & Docker Architecture Notes for Agents

1. **Monorepo Structure**:
   - The workspace uses `pnpm` with subpackages in `client/` and `server/`.
   - Root `pnpm-workspace.yaml` defines workspace packages and `onlyBuiltDependencies` / `allowBuilds`.
   - Subdirectories `client/` and `server/` also contain local `pnpm-workspace.yaml` files because Docker Compose mounts `./client` and `./server` individually into `/app` inside containers.

2. **Patch-Package**:
   - `patch-package` is used in both `client` and `server`.
   - `skipper-disk` and `waterline` must remain declared in `server/package.json` so PNPM hoists them where `patch-package` expects them.
   - `@gravity-ui/markdown-editor` version in `client/package.json` must match its patch file version (`15.35.1`).

3. **Native Modules (`lodepng`)**:
   - `lodepng` is rebuilt via `pnpm rebuild lodepng` in `server/package.json`'s `postinstall` script. If `.node` binary mismatch occurs between host and Alpine container, trigger `pnpm rebuild lodepng` or `node-gyp rebuild` in the target environment.

4. **Vite Watcher (ENOSPC Prevention)**:
   - `client/vite.config.js` configures `server.watch.ignored: ['**/.pnpm-store/**', '**/node_modules/**']` to avoid inotify watcher limit failures (`ENOSPC`) inside Docker.

5. **Dependency Updates & Audit**:
   - Dependency warnings from `npm install` or `npm audit` can appear during container startup. Do not change dependencies or run audit fixes unless the user asks for that work.
