# syntax=docker/dockerfile:1

# Debian slim rather than Alpine: fluent-ffmpeg shells out to the system
# ffmpeg/ffprobe binaries, and Debian's build carries broader codec support
# than Alpine's musl build. Uploads arrive as arbitrary user video, so codec
# coverage matters more here than the smaller base image.

# ---- Stage 1: build ---------------------------------------------------------
FROM node:22-bookworm-slim AS build

WORKDIR /app

# Copy manifests first so `npm ci` is cached until dependencies actually change.
COPY package.json package-lock.json ./

# `npm ci` needs devDependencies (TypeScript) to compile.
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src

# Emits ./dist. The build config flips noEmit off and rewrites the .ts import
# specifiers to .js so the output resolves at runtime.
RUN npm run build

# ---- Stage 2: runtime -------------------------------------------------------
FROM node:22-bookworm-slim AS runtime

# ffmpeg provides both `ffmpeg` and `ffprobe`; fluent-ffmpeg resolves them from
# PATH, and the app calls ffprobe for duration and ffmpeg for compression.
# ca-certificates is needed for outbound TLS to Cloudinary, Brevo, and Atlas.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

WORKDIR /app

COPY package.json package-lock.json ./

# Production install only — TypeScript and friends are not needed to run dist/.
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# Multer writes uploads to <app>/tmp/uploads before handing them to ffmpeg and
# Cloudinary. Create it up front and hand it to the runtime user, since the
# app would otherwise try to mkdir it as a non-root user at import time.
RUN mkdir -p /app/tmp/uploads \
    && chown -R node:node /app

# Drop root: the app processes untrusted uploaded media through ffmpeg, so a
# decoder bug should not land an attacker as root inside the container.
USER node

# Documentation only — the app binds to $PORT, which Render injects.
EXPOSE 5002

# Container-level health signal. The app exposes GET /health, and Node 22 has
# fetch built in, so this needs no extra dependency.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5002)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Exec form so Node runs as PID 1 and receives SIGTERM directly, letting the
# platform stop the container without a 10-second kill delay.
CMD ["node", "dist/index.js"]
