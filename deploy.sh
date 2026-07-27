#!/bin/bash

#!/bin/bash

LOCAL_PATH="/Users/robertohernandez/Documents/Sentinel/web/"
REMOTE_USER="jessy"
REMOTE_HOST="13.140.167.225"
REMOTE_PATH="/var/www/sentinel"

echo "🚀 Subiendo proyecto Node.js a la VPS..."

# Subir archivos excluyendo node_modules, git y el script
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'deploy.sh' \
  "$LOCAL_PATH" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH"

echo "📦 Instalando dependencias y reiniciando app..."

# Conectarse por SSH para instalar dependencias y reiniciar el proceso
ssh "$REMOTE_USER@$REMOTE_HOST" << 'EOF'
  cd /var/www/sentinel
  npm install --production
  pm2 restart sentinel || pm2 start index.js --name "sentinel"
EOF

echo "✅ ¡Despliegue completado con éxito!"