#!/usr/bin/env bash
# run.sh — one-step build and run for the project
# Usage: ./run.sh [--image NAME] [--no-cache] [--help]
# By default this will try to build & run using Docker if a Dockerfile exists and docker is runnable.
# Otherwise it will try common local build/run flows (npm, go, cargo, maven, gradle, make).

set -euo pipefail

ROOTDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOTDIR"

print() { printf '%s\n' "$*"; }
err() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

# Defaults
IMAGE_NAME="${IMAGE_NAME:-$(basename "$ROOTDIR" | tr '[:upper:]' '[:lower:]')}:latest"
NO_CACHE=false
DO_DOCKER=false

# Simple arg parsing
while [[ "${1:-}" != "" ]]; do
    case "$1" in
        --image) shift; IMAGE_NAME="$1"; shift ;;
        --no-cache) NO_CACHE=true; shift ;;
        --no-docker) DO_DOCKER=true; shift ;; # force local build
        -h|--help) cat <<EOF
Usage: $0 [options]
Options:
    --image NAME    Set docker image name (default: ${IMAGE_NAME})
    --no-cache      Pass --no-cache to docker build (when using Docker)
    --no-docker     Skip Docker even if Dockerfile exists
    -h, --help      Show this help
EOF
            exit 0 ;;
        *) err "Unknown option: $1" ;;
    esac
done

# Helpers
command_exists() { command -v "$1" >/dev/null 2>&1; }

# If Dockerfile exists and docker is available (and not forced local), prefer Docker
if [[ -f "Dockerfile" && -z "${DO_DOCKER:-}" ]]; then
    if command_exists docker; then
        DOCKER_AVAILABLE=true
    else
        DOCKER_AVAILABLE=false
    fi
else
    DOCKER_AVAILABLE=false
fi

if $DOCKER_AVAILABLE; then
    print "Detected Dockerfile and docker available — building image ${IMAGE_NAME}"
    BUILD_ARGS=()
    if $NO_CACHE; then BUILD_ARGS+=(--no-cache); fi

    docker build "${BUILD_ARGS[@]}" -t "$IMAGE_NAME" .
    # Try to find first EXPOSE port to map automatically (optional)
    PORT_MAP=()
    if grep -iE '^EXPOSE' Dockerfile >/dev/null 2>&1; then
        EXPOSE_PORT=$(grep -iE '^EXPOSE' Dockerfile | head -n1 | awk '{print $2}' | tr -d '\r')
        if [[ -n "$EXPOSE_PORT" ]]; then
            print "Mapping container port $EXPOSE_PORT -> host $EXPOSE_PORT"
            PORT_MAP=(-p "${EXPOSE_PORT}:${EXPOSE_PORT}")
        fi
    fi

    print "Running image $IMAGE_NAME (Ctrl-C to stop)..."
    docker run --rm -it "${PORT_MAP[@]}" "$IMAGE_NAME"
    exit 0
fi

# Local build & run flows
print "No usable Docker build detected or docker not available — attempting local build/run."

# npm / Node.js
if [[ -f package.json ]]; then
    if ! command_exists node; then err "node is not installed"; fi
    if command_exists npm; then
        print "Detected package.json — running npm ci"
        npm ci
        # If there's a build script, run it
        if grep -q "\"build\"" package.json; then
            print "Running npm run build"
            npm run build
        fi
        # Start using npm start if present
        if grep -q "\"start\"" package.json; then
            print "Running npm start"
            npm start
            exit 0
        fi
        # Fallback: try node index.js or server.js
        for entry in index.js server.js app.js main.js; do
            if [[ -f "$entry" ]]; then
                print "Running node $entry"
                node "$entry"
                exit 0
            fi
        done
        err "No start script or recognized entrypoint found in package.json"
    else
        err "npm is not installed"
    fi
fi

# Go
if [[ -f go.mod ]]; then
    if ! command_exists go; then err "go is not installed"; fi
    BIN=bin/$(basename "$ROOTDIR")
    mkdir -p bin
    print "Building Go binary -> $BIN"
    go build -o "$BIN" .
    print "Running $BIN"
    exec "$BIN"
fi

# Rust (cargo)
if [[ -f Cargo.toml ]]; then
    if ! command_exists cargo; then err "cargo is not installed"; fi
    print "Building with cargo (release)"
    cargo build --release
    # try to find binary in target/release
    PROG_NAME=$(basename "$ROOTDIR")
    if [[ -f "target/release/$PROG_NAME" ]]; then
        exec "target/release/$PROG_NAME"
    else
        # pick first executable in target/release
        EXE=$(find target/release -maxdepth 1 -type f -perm /111 | head -n1 || true)
        if [[ -n "$EXE" ]]; then exec "$EXE"; fi
        err "Could not find built cargo binary"
    fi
fi

# Java (maven / gradle)
if [[ -f pom.xml ]]; then
    if ! command_exists mvn; then err "maven (mvn) is not installed"; fi
    print "Building with Maven (skip tests)"
    mvn -DskipTests package
    # run the generated jar if any
    JAR=$(find target -maxdepth 2 -name '*.jar' -not -name '*sources*' | head -n1 || true)
    if [[ -n "$JAR" ]]; then
        print "Running $JAR"
        exec java -jar "$JAR"
    fi
    err "No runnable JAR found in target/"
fi

if [[ -f build.gradle || -f build.gradle.kts ]]; then
    if [[ -f gradlew && -x gradlew ]]; then
        GRADLE_CMD=./gradlew
    else
        GRADLE_CMD=gradle
        command_exists gradle || err "gradle is not installed and no gradlew wrapper found"
    fi
    print "Building with Gradle"
    "$GRADLE_CMD" build
    JAR=$(find build -maxdepth 3 -name '*.jar' | head -n1 || true)
    if [[ -n "$JAR" ]]; then
        print "Running $JAR"
        exec java -jar "$JAR"
    fi
    err "No runnable JAR found in build/"
fi

# Makefile
if [[ -f Makefile ]]; then
    if command_exists make; then
        print "Running make"
        make
        # Try to run a likely bin
        if [[ -f bin/$(basename "$ROOTDIR") ]]; then
            exec "bin/$(basename "$ROOTDIR")"
        fi
        exit 0
    fi
fi

# Python
if [[ -f requirements.txt || -f pyproject.toml || -f setup.py ]]; then
    if ! command_exists python3; then err "python3 is not installed"; fi
    print "Creating venv .venv and installing dependencies"
    python3 -m venv .venv
    # shellcheck disable=SC1091
    source .venv/bin/activate
    if [[ -f requirements.txt ]]; then pip install -r requirements.txt; fi
    if [[ -f pyproject.toml ]]; then pip install .; fi
    # try common entrypoints
    for entry in app.py main.py server.py; do
        if [[ -f "$entry" ]]; then
            print "Running python $entry"
            exec python "$entry"
        fi
    done
    err "No Python entrypoint found"
fi

err "No recognized build/run flow found. Add a Dockerfile or one of: package.json, go.mod, Cargo.toml, pom.xml, build.gradle, Makefile, Python project files."