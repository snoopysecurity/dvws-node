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

# Add wait script
ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.9.0/wait /wait
RUN chmod +x /wait

# Expose ports
EXPOSE 80 4000 9090

# Start command
CMD /wait && node startup_script.js && npm start
