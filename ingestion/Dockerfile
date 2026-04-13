FROM node:25-alpine
WORKDIR /app
RUN apk add --no-cache curl
COPY ingestion/package*.json ./
RUN npm install
COPY ingestion/ ./
COPY lib/ ./lib/
EXPOSE 3001
CMD ["npm", "start"]
