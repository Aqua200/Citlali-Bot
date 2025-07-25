import fs from 'fs/promises';
import path, { dirname } from 'path';
import { spawn } from 'child_process';
import syntaxError from 'syntax-error';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

async function checkSyntax() {
  try {
    const packageJson = require('./package.json');
    const directories = ['.', ...Object.keys(packageJson.directories || {})];
    const jsFiles = [];

    for (const dir of directories) {
      try {
        const files = await fs.readdir(dir);
        for (const file of files) {
          if (file.endsWith('.js')) {
            const filePath = path.resolve(dir, file);
            if (filePath !== __filename) {
              jsFiles.push(filePath);
            }
          }
        }
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`Error al leer el directorio: ${dir}`, err);
        }
      }
    }

    for (const file of jsFiles) {
      console.log(`Verificando sintaxis en: ${file}`);
      const code = await fs.readFile(file, 'utf8');
      const err = syntaxError(code, file, {
        sourceType: 'module',
        allowReturnOutsideFunction: true,
        allowAwaitOutsideFunction: true,
      });

      if (err) {
        console.error(`Error de sintaxis en el archivo: ${file}\n${err}`);
        process.exit(1); 
      }
    }

    console.log('Todos los archivos JavaScript tienen una sintaxis válida.');
  } catch (error) {
    console.error('Ocurrió un error inesperado durante la verificación de sintaxis:', error);
    process.exit(1);
  }
}

checkSyntax();
