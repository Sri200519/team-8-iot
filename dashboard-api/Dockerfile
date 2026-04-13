FROM node:25-alpine
WORKDIR /app
RUN apk add --no-cache curl
COPY dashboard-api/package*.json ./
RUN npm install
COPY dashboard-api/ ./
COPY lib/ ./lib/
EXPOSE 3000
CMD ["npm", "start"]
