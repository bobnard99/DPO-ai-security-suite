# Use a stable long-term support Node runtime as the baseline image
FROM node:20-alpine

# Set the secure workspace directory inside the target container layout
WORKDIR /app

# Copy application manifest tracking blocks first to optimize caching tiers
COPY package*.json ./

# Install absolute clean production node dependencies
RUN npm install

# Bind and overlay the remainder of your local backend application files
COPY . .

# Expose the internal network tracking port matching your backend .env configurations
EXPOSE 5000

# Fire up the application server runtime engine
CMD ["npm", "start"]
