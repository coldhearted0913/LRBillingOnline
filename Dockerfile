# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy prisma schema
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy all files
COPY . .

# Build the Next.js app
RUN npm run build

# Expose port
EXPOSE 3000

# Create directory for database and invoices
RUN mkdir -p /app/prisma /app/invoices

# Set environment to production
ENV NODE_ENV=production

# Start the app
CMD ["npm", "start"]

