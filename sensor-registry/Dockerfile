FROM node:18
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*
COPY sensor-registry/package*.json ./
RUN npm install
COPY sensor-registry/ ./
COPY lib/ ./lib/
EXPOSE 3000
CMD ["npm", "start"]
