# Agent Instructions

## Development Startup

- Run the development stack only through Docker Compose.
- Do not start dev services with local `npm start`, `npm run start`, `npm run client:start`, `npm run server:start`, direct `vite`, or direct `nodemon`.
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

## Local Dev URLs

- Client: `http://localhost:3005`
- Server API: `http://localhost:1338`
- Postgres is only exposed inside the Compose network.
- Demo login from `docker-compose-dev.yml`: username `demo`, email `demo@demo.demo`, password `demo`.

## Startup Verification

After starting the stack, verify the app through the Compose-published ports:

```bash
curl -sS -D - http://localhost:3005/ -o /tmp/planka-client-index.html
curl -sS -D - http://localhost:3005/api/bootstrap -o /tmp/planka-bootstrap.json
curl -sS -D - -H 'Content-Type: application/json' \
  -d '{"emailOrUsername":"demo","password":"demo"}' \
  http://localhost:3005/api/access-tokens \
  -o /tmp/planka-login.json
```

Expected results:

- `http://localhost:3005/` returns `200 OK`.
- `http://localhost:3005/api/bootstrap` returns `200 OK`.
- Login through `http://localhost:3005/api/access-tokens` returns `200 OK` with a JSON `item` access token.

The server root at `http://localhost:1338/` is not a useful health check in dev. It may return a Sails view-rendering error because the dev client is served separately by Vite.

Dependency warnings from `npm install` or `npm audit` can appear during container startup. Do not change dependencies or run audit fixes unless the user asks for that work.
