FROM node:22

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    build-essential \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /home/dvws-node

# Copy package files first for caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Build Svelte frontend (outputs directly to ../public via adapter-static config)
RUN cd frontend && npm install && npm run build

# Expose ports
EXPOSE 80

# Start command
CMD node scripts/seed-database.js && npm start
