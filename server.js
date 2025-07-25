import express from 'express';
import { createServer } from 'http';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { toBuffer } from 'qrcode';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import { watchFile, unwatchFile } from 'fs';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;

async function keepAliveRenderHost() {
  const configPath = join(__dirname, 'config.js');
  if (process.env.RENDER_EXTERNAL_URL) {
    setInterval(async () => {
      try {
        const res = await fetch(process.env.RENDER_EXTERNAL_URL);
        if (res.status === 200) {
          const result = await res.text();
          console.log(chalk.cyan('Ping a Render exitoso:'), result);
        } else {
          console.warn(chalk.yellow(`Ping a Render devolvió el estado: ${res.status}`));
        }
      } catch (error) {
        console.error(chalk.red('Error en keepAliveRenderHost al hacer fetch:'), error);
      }
    }, FIVE_MINUTES_IN_MS);
  } else {
    try {
      let configContent = await fs.readFile(configPath, 'utf8');
      const needsUpdate = configContent.includes('global.obtenerQrWeb = 1;') || configContent.includes('global.keepAliveRender = 1;');
      if (needsUpdate) {
        console.log(chalk.yellow("No se detecta un entorno de Render.com. Actualizando 'config.js'..."));
        configContent = configContent
          .replace('global.obtenerQrWeb = 1;', 'global.obtenerQrWeb = 0;')
          .replace('global.keepAliveRender = 1;', 'global.keepAliveRender = 0;');
        await fs.writeFile(configPath, configContent, 'utf8');
        console.log(chalk.green("Archivo 'config.js' actualizado correctamente a valores de '0'."));
      }
    } catch (error) {
      console.error(chalk.red("Error al leer o modificar 'config.js' en keepAliveRenderHost:"), error);
    }
  }
}

function keepAliveReplit() {
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    const url = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
    console.log(chalk.blue(`Configurado keep-alive para Replit en la URL: ${url}`));
    setInterval(() => {
      fetch(url).catch(error => console.error(chalk.red('Error en keepAliveReplit:'), error));
    }, FIVE_MINUTES_IN_MS);
  }
}

function connect(conn, PORT, opts = {}) {
  const app = express();
  const server = createServer(app);
  let qrCode = 'QR inválido, probablemente ya hayas escaneado el código.';
  conn.ev.on('connection.update', ({ qr }) => {
    if (qr) {
      qrCode = qr;
      if (process.env.RENDER_EXTERNAL_URL) {
        console.log(chalk.green(`Para escanear el código QR, visita: ${process.env.RENDER_EXTERNAL_URL}/get-qr-code`));
      }
    }
  });
  app.get('/get-qr-code', async (req, res) => {
    try {
      res.setHeader('content-type', 'image/png');
      res.end(await toBuffer(qrCode));
    } catch (error) {
      console.error(chalk.red('Error al generar el buffer del QR:'), error);
      res.status(500).send('No se pudo generar el código QR.');
    }
  });
  app.get('*', (req, res) => {
    res.json({ status: "Citlali-Bot en ejecución" });
  });
  server.listen(PORT, () => {
    console.log(chalk.bold.magenta(`Servidor escuchando en el puerto ${PORT}`));
    keepAliveRenderHost();
    if (opts.keepalive) {
      keepAliveReplit();
    }
  });
  return { app, server };
}

function pipeEmit(event, event2, prefix = '') {
  const originalEmit = event.emit;
  event.emit = function (eventName, ...args) {
    originalEmit.call(this, eventName, ...args);
    event2.emit(prefix + eventName, ...args);
  };
  return {
    unpipeEmit() {
      event.emit = originalEmit;
    },
  };
}

function selfWatch() {
  watchFile(file, async () => {
    unwatchFile(file);
    console.log(chalk.redBright(`\n'${__filename}' ha sido actualizado. Reiniciando...`));
    await import(`${fileURLToPath(import.meta.url)}?update=${Date.now()}`);
  });
}

export default connect;

selfWatch();
