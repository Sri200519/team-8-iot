FROM node:25-alpine
WORKDIR /app
RUN apk add --no-cache curl
COPY device-management/package*.json ./
RUN npm install
COPY device-management/ ./
COPY lib/ ./lib/
EXPOSE 3000
CMD ["npm", "start"]
