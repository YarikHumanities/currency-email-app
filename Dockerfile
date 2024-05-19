FROM node:18

WORKDIR /app

# Install dependencies (including sqlite3)
COPY package*.json ./
RUN npm install --no-optional

# 2. Install pre-built sqlite3 binary (before rebuilding)
RUN apt-get update && apt-get install -y libsqlite3-dev 

# 3. Rebuild sqlite3 for amd64 
RUN npm rebuild 'sqlite3' --target=18 --arch=amd64 

# Copy the rest of the application code (after rebuild)
COPY . .

# Set environment variables from .env file
COPY .env .
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]