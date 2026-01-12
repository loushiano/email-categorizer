# ===========================================
# Stage 1: Extract package dependencies
# ===========================================
FROM alpine AS package-slim

RUN apk add --update --no-cache jq

COPY package.json /tmp
RUN jq '{ dependencies, devDependencies }' < /tmp/package.json > /tmp/package-slim.json

# ===========================================
# Stage 2: Build the application
# ===========================================
FROM node:20-bullseye-slim AS build

WORKDIR /app

# Copy package files
COPY --from=package-slim /tmp/package-slim.json ./package.json
COPY package-lock.json ./
RUN npm install --frozen-lockfile

COPY . .
RUN npm run build

# ===========================================
# Stage 3: Production image with Puppeteer
# ===========================================
FROM node:20-bullseye-slim AS production

# Install Puppeteer dependencies
# These are required for Chromium to run in headless mode
RUN apt-get update && apt-get install -y \
    # Chromium dependencies
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    iproute2 \
    curl \
    # Additional utilities
    dumb-init \
    # Clean up
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser -G audio,video appuser \
    && mkdir -p /home/appuser/Downloads \
    && chown -R appuser:appuser /home/appuser

WORKDIR /app

# Copy package files and install production dependencies only
COPY --from=package-slim /tmp/package-slim.json ./package.json
COPY package-lock.json ./
RUN npm ci --only=production

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Install Chrome via Puppeteer (downloads compatible version to ~/.cache/puppeteer)
# Set PUPPETEER_CACHE_DIR so it's accessible to the app
ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer
RUN npx puppeteer browsers install chrome

# Change ownership of app directory (including puppeteer cache)
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8085

# Use dumb-init as entrypoint to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/src/main.js"]
