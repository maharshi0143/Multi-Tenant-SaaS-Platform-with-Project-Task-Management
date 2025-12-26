# 1. Use Node 20 or higher to satisfy Vite 7 requirements
FROM node:20-alpine

# 2. Set working directory
WORKDIR /usr/src/app

# 3. Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# 4. Copy the rest of the application code
COPY . .

# 5. Expose the mandatory frontend port
EXPOSE 3000

# 6. Start the development server with the host flag
CMD ["npm", "run", "dev", "--", "--host"]