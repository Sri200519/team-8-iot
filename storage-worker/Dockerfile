FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache curl

COPY storage-worker/package*.json ./
RUN npm install

COPY storage-worker/server.js .

CMD ["node", "server.js"]
