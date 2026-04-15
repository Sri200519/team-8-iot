FROM node:lts-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3002

CMD ["node", "index.js"]