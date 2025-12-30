# Load environment variables from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
fi

# 1. Setup SSH key and known_hosts
echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
chmod 600 ~/.ssh/id_rsa

# Add server host key so SSH does not ask for confirmation
ssh-keyscan -H "$SSH_HOST" >> ~/.ssh/known_hosts

ssh -i "$SSH_SECRET_PATH" "$SSH_USER"@"$SSH_HOST" "bash" << 'EOF'
    set -e

    cd "/home/ubuntu/StorageApp-Backend"
    git pull
    npm ci
    pm2 reload storageApp
EOF