FROM node:20-slim

# Install Chromium system dependencies
RUN apt-get update && apt-get install -y \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libdbus-1-3 libexpat1 libxcb1 \
    libxkbcommon0 libx11-6 libxcomposite1 libxdamage1 \
    libxext6 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 \
    libcairo2 libasound2 libatspi2.0-0 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Set browser path BEFORE installing so runtime finds it in same location
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.cache/ms-playwright
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci

# Install Chromium into /app/.cache/ms-playwright
RUN npx playwright install chromium

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
