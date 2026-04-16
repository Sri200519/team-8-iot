FROM node:lts-alpine

WORKDIR /app

COPY anomaly-worker/package*.json ./
RUN npm install --production

COPY anomaly-worker/ .

EXPOSE 3002

CMD ["node", "index.js"]