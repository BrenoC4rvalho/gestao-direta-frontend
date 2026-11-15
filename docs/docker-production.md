# Frontend Docker production

## Local smoke test (backend not required to test the static UI)

```sh
docker build -t gestao-direta-frontend:local .
docker run --rm -d --name gestao-direta-frontend-test -p 127.0.0.1:8088:80 gestao-direta-frontend:local
curl -i http://127.0.0.1:8088/healthz
curl -I http://127.0.0.1:8088/
docker stop gestao-direta-frontend-test
```

The container's /api upstream requires the backend DNS alias `gestao-direta-api`
on the same Docker network. If you test the standalone container without that
network/backend, Nginx will fail startup because the upstream hostname cannot
be resolved. For a full integration test, use the production Compose network
with the backend running, or provide a temporary test container on the same
network using that alias.

## VPS deployment

```sh
cd /opt/apps/gestao-direta
git clone --branch chore/docker-production-frontend https://github.com/BrenoC4rvalho/gestao-direta-frontend.git frontend
cd frontend
docker compose -f compose.prod.yaml config --quiet
docker compose -f compose.prod.yaml up -d --build
docker compose -f compose.prod.yaml ps
```

Before exposing the frontend, add a Caddy site:

```caddyfile
gestaodireta.brenocarvalhodev.io {
    reverse_proxy gestao-direta-frontend:80
}
```

Keep the existing API site and Telegram webhook untouched.
The frontend uses `/api` (same origin), proxied by Nginx to
`gestao-direta-api:8080`; the backend already has the /api context path.
Ensure HTTPS works and test login, session, logout, deep links, and API health.
Never put secrets in Angular environment files.
