# Stage 1: Build & Dependencies
FROM node:18-slim AS builder

WORKDIR /usr/src/app

# Install build dependencies for bcrypt (Python, make, g++, build-essential)
# Debian-based images generally use apt-get
# Build tools removed - using pure JS bcryptjs


# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy source code
COPY . .

# Stage 2: Production Runtime
FROM node:18-slim

WORKDIR /usr/src/app

# Copy built artifacts from builder stage (node_modules + code)
COPY --from=builder /usr/src/app .

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl

# Expose the mandatory backend port
EXPOSE 5000

# Start command
CMD ["npm", "start"]