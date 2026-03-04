# Development Dockerfile for Frontend
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Run development server with host flag to allow external access
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
