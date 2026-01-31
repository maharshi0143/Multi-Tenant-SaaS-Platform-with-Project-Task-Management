# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy source code
COPY . .

# Stage 2: Production Runtime
FROM node:20-alpine

WORKDIR /usr/src/app

# Copy built artifacts from builder stage (node_modules + code)
COPY --from=builder /usr/src/app .

# Install curl for healthcheck
RUN apk add --no-cache curl

# Expose the mandatory backend port
EXPOSE 5000

# Start command
CMD ["npm", "start"]