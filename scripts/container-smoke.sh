#!/usr/bin/env bash
set -euo pipefail

build_id="smoke-${GITHUB_SHA:-local}-$$"
image="mytube-ci-smoke:${build_id}"
container="mytube-ci-smoke-${GITHUB_RUN_ID:-local}-$$"
port="${MYTUBE_SMOKE_PORT:-}"
token="ci-smoke-token"

mkdir -p output/container

cleanup() {
	docker logs "$container" >output/container/server.log 2>&1 || true
	docker rm -f "$container" >/dev/null 2>&1 || true
	docker image rm "$image" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker build --tag "$image" --build-arg "BUILD_ID=${build_id}" --build-arg "GIT_REVISION=${GITHUB_SHA:-local}" .
docker run --detach \
	--name "$container" \
	--publish "127.0.0.1:${port}:8080" \
	--env "SERVER_API_TOKEN=${token}" \
	--env "FEED_REFRESH_ENABLED=false" \
	--env "FEED_REFRESH_ON_START=false" \
	--env "BACKFILL_TRICKLE_ENABLED=false" \
	"$image" >/dev/null
port="$(docker inspect --format '{{(index (index .NetworkSettings.Ports "8080/tcp") 0).HostPort}}' "$container")"

for _ in {1..45}; do
	if curl --fail --silent "http://127.0.0.1:${port}/api/healthz" >/dev/null; then
		break
	fi
	if [[ "$(docker inspect --format '{{.State.Status}}' "$container")" != "running" ]]; then
		docker logs "$container"
		exit 1
	fi
	sleep 2
done

curl --fail --silent "http://127.0.0.1:${port}/api/healthz" >/dev/null

unauthorized_status="$(
	curl --silent --output /dev/null --write-out '%{http_code}' \
		"http://127.0.0.1:${port}/api/sync"
)"
[[ "$unauthorized_status" == "401" ]]

curl --fail --silent \
	--header "Authorization: Bearer ${token}" \
	"http://127.0.0.1:${port}/api/sync" >/dev/null

curl --fail --silent "http://127.0.0.1:${port}/" | grep --quiet '<div id="root"></div>'

curl --fail --silent --header "Authorization: Bearer ${token}" \
	"http://127.0.0.1:${port}/api/version" | python3 -c 'import json,sys; assert json.load(sys.stdin)["buildId"] == sys.argv[1]' "$build_id"

for _ in {1..25}; do
	health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$container")"
	if [[ "$health" == "healthy" ]]; then
		break
	fi
	if [[ "$health" == "unhealthy" || "$health" == "missing" ]]; then
		docker logs "$container"
		exit 1
	fi
	sleep 2
done

if [[ "$(docker inspect --format '{{.State.Health.Status}}' "$container")" != "healthy" ]]; then
	docker logs "$container"
	exit 1
fi
if [[ "$(docker inspect --format '{{.RestartCount}}' "$container")" != "0" ]]; then
	docker logs "$container"
	exit 1
fi

logs="$(docker logs "$container" 2>&1)"
if grep --extended-regexp --quiet 'Unhandled|EADDRINUSE|FATAL|Fatal' <<<"$logs"; then
	echo "$logs"
	exit 1
fi
