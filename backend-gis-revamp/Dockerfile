# Use the official Node.js image
FROM node:22

# Install PostgreSQL client
RUN apt-get update && apt-get install -y postgresql-client

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the application port
EXPOSE 8080

# Command to run the application
CMD ["node", "index.js"]
