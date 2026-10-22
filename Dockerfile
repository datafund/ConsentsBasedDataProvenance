FROM node:20-alpine

WORKDIR /app

# Install build dependencies for native modules (linux-headers, eudev-dev and
# libusb-dev are needed to build node-hid, pulled in by @nomicfoundation/hardhat-ledger)
RUN apk add --no-cache python3 make g++ linux-headers eudev-dev libusb-dev

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Compile contracts
RUN npx hardhat compile

# Expose Hardhat node port
EXPOSE 8545

# Default command: run Hardhat node
CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]
