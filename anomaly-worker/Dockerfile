FROM node:lts-alpine

WORKDIR /app

RUN apk add --no-cache curl

COPY anomaly-worker/package*.json ./
RUN npm install --production

COPY anomaly-worker/ .

EXPOSE 3002

CMD ["node", "server.js"]