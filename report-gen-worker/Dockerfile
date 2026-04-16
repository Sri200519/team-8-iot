FROM node:25-alpine
WORKDIR /app
RUN apk add --no-cache curl
COPY report-gen-worker/package*.json ./
RUN npm install
COPY report-gen-worker/ ./
EXPOSE 3000
CMD ["npm", "start"]
