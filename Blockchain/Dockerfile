FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install only production dependencies to keep image small
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

ENV PORT=3000
EXPOSE 3000

# Start the backend server which serves the frontend
CMD ["node", "backend/server.js"]
