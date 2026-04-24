const fs = require('fs');
const path = require('path');

function loadEnv() {
  const env = {};
  if (!fs.existsSync('.env')) return env;
  fs.readFileSync('.env', 'utf8').split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  });
  return env;
}

function build() {
  const env = loadEnv();
  const shell = fs.readFileSync('src/shell.html', 'utf8');
  const css = fs.readFileSync('src/style.css', 'utf8');

  const jsFiles = ['i18n.js', 'auth.js', 'core.js', 'reservas.js', 'mesas.js', 'articulos.js', 'historial.js', 'plan.js', 'usuarios.js'];
  const js = jsFiles.map(f => fs.readFileSync(path.join('src/js', f), 'utf8')).join('\n\n');

  let html = shell
    .replace('/* STYLE_PLACEHOLDER */', css)
    .replace('/* JS_PLACEHOLDER */', js);

  Object.entries(env).forEach(([key, value]) => {
    html = html.replaceAll(key, value);
  });

  fs.writeFileSync('index.html', html);
  console.log('Built index.html');
}

build();
module.exports = { build };
