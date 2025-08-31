FROM node:20-bullseye

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --legacy-peer-deps

COPY . .

RUN npm run build && npm run postbuild

CMD ["npm", "start"]
