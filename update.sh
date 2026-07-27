#!/bin/bash

# Entrar a la carpeta del proyecto
cd /Users/robertohernandez/Documents/Sentinel/web || exit

# Pedir un mensaje para el commit
echo "📝 Escribe un mensaje breve sobre los cambios que hiciste:"
read -r commit_message

# Si no escribes nada, poner un mensaje por defecto
if [ -z "$commit_message" ]; then
  commit_message="Actualización de la web"
fi

echo "🚀 Guardando y subiendo cambios a GitHub..."

# Agregar todos los archivos modificados
git add .

# Guardar los cambios
git commit -m "$commit_message"

# Subir a la rama principal
git push origin main

echo "✅ ¡Listo! Render detectará los cambios en GitHub y actualizará tu web en 2-3 minutos."
