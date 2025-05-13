FROM node:16-alpine

# Create app directory
WORKDIR /usr/src/app

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy client package.json
COPY client/package*.json ./client/

# Install client dependencies
RUN cd client && npm ci --only=production

# Copy app source
COPY --chown=appuser:appgroup . .

# Create logs directory and set permissions
RUN mkdir -p logs && chown -R appuser:appgroup logs

# Build client
RUN cd client && npm run build

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "const http = require('http'); const options = { hostname: 'localhost', port: process.env.PORT || 8080, path: '/api/health', timeout: 2000 }; const req = http.get(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.end();"

# Start command
CMD ["node", "server.js"]
