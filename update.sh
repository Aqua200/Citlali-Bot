#!/data/data/com.termux/files/usr/bin/bash
# ==============================
# Script de actualización 2025
# Original: @gata_dios 
# Echo por Neykor

# Configuración básica
BOT_DIR="Citlali-Bot"
BOT_REPO="https://github.com/Aqua200/$BOT_DIR"
DB_FILE="database.json"


GREEN='\033[32m'
BOLD='\033[1m'
RESET='\033[0m'


exec > >(tee -a "$HOME/update_bot.log") 2>&1

log() {
  echo -e "${BOLD}${GREEN}$1${RESET}"
}


check_dependency() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log "❌ Error: $1 no está instalado. Instálalo primero."
    exit 1
  fi
}

check_dependency git
check_dependency npm
check_dependency yarn


backup_db() {
  if [ -e "$HOME/$DB_FILE" ]; then
    local BACKUP="$HOME/${DB_FILE}_backup_$(date +%Y%m%d%H%M%S)"
    cp "$HOME/$DB_FILE" "$BACKUP"
    log "📦 Backup creado: $BACKUP"
  fi
}


clean_old() {
  if [ -d "$HOME/$BOT_DIR/node_modules" ]; then
    rm -rf "$HOME/$BOT_DIR/node_modules"
    log "🧹 Limpiando node_modules antiguos..."
  fi
}


clone_and_install() {
  rm -rf "$HOME/$BOT_DIR"
  if git clone "$BOT_REPO"; then
    cd "$BOT_DIR" || exit
    clean_old
    yarn --ignore-scripts
    npm install
  else
    log "❌ Error al clonar el repositorio. Revisa tu conexión."
    exit 1
  fi
}


rescue_db() {
  if [ -e "$HOME/$DB_FILE" ]; then
    mv "$HOME/$DB_FILE" "$HOME/$BOT_DIR/"
    log "♻️ Rescatando DB y moviendo a $BOT_DIR."
  fi
}

start_bot() {
  cd "$BOT_DIR" || exit
  chmod -R 755 .
  log "🚀 Iniciando $BOT_DIR..."
  npm start
}


# ⚙️ Flujo principal


cd "$HOME" || exit


backup_db


if [ -d "$BOT_DIR" ] && [ -e "$BOT_DIR/$DB_FILE" ]; then
  mv "$BOT_DIR/$DB_FILE" "$HOME/"
  log "📂 Moviendo DB desde $BOT_DIR a $HOME temporalmente."
fi


clone_and_install

rescue_db


termux-notification --title "Actualización completada" --content "$BOT_DIR listo para iniciar." --priority high


start_bot
