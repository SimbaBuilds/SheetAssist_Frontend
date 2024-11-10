#!/bin/bash

# Create certificates directory if it doesn't exist
mkdir -p certificates

# Check if mkcert is installed
if ! command -v mkcert &> /dev/null; then
    echo "mkcert is not installed. Installing mkcert..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install mkcert
        brew install nss # for Firefox
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo apt install libnss3-tools
        sudo apt install mkcert
    else
        echo "Please install mkcert manually for your operating system"
        exit 1
    fi
fi

# Install local CA
mkcert -install

# Generate certificates
cd certificates
mkcert localhost 127.0.0.1 ::1
mv localhost+2-key.pem localhost-key.pem
mv localhost+2.pem localhost.pem 