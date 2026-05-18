FROM node:20-bullseye

WORKDIR /app

COPY package*.json ./
RUN npm ci

# Install Playwright system deps + Chromium browser
RUN npx playwright install-deps chromium && npx playwright install chromium

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright

EXPOSE 3000
CMD ["npm", "start"]
