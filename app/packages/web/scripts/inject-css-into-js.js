const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const assets = path.join(dist, 'assets');
const indexHtml = path.join(dist, 'index.html');

if (!fs.existsSync(assets) || !fs.existsSync(indexHtml)) {
  console.error('dist/assets o dist/index.html no existen. Corre primero: tsc && vite build');
  process.exit(1);
}

const html = fs.readFileSync(indexHtml, 'utf8');

const jsMatch = html.match(/<script[^>]*src="\.\/assets\/(index-[^"]+\.js)"[^>]*>/);
if (!jsMatch) {
  console.error('No se encontró el entry JS en index.html');
  process.exit(1);
}
const jsName = jsMatch[1];
const jsPath = path.join(assets, jsName);

const cssMatches = fs.readdirSync(assets).filter((f) => /\.css$/.test(f));
if (!cssMatches.length) {
  console.error('No hay archivo .css en assets');
  process.exit(1);
}
const cssPath = path.join(assets, cssMatches[0]);
const cssName = cssMatches[0];

const cssText = fs.readFileSync(cssPath, 'utf8');
const cssBytes = Buffer.byteLength(cssText, 'utf8');
const b64 = Buffer.from(cssText, 'utf8').toString('base64');

const decoded = Buffer.from(b64, 'base64').toString('utf8');
if (decoded !== cssText) {
  console.error('Verificación base64 FALLÓ: el CSS no se decodifica igual.');
  process.exit(1);
}

const snippet =
  '/* CookPlan CSS-in-JS */\n' +
  '(function(){var d=document;try{if(!d.getElementById("cookplan-css")){var s=d.createElement("style");' +
  's.id="cookplan-css";s.type="text/css";' +
  's.textContent=new TextDecoder().decode(Uint8Array.from(atob("' + b64 +
  '"),function(c){return c.charCodeAt(0)}));d.head.appendChild(s);}}catch(e){}})();\n';

const js = fs.readFileSync(jsPath, 'utf8');
fs.writeFileSync(jsPath, snippet + js);

fs.unlinkSync(cssPath);

const newHtml = html
  .replace(/<link[^>]*href="\.\/assets\/[^"]*\.css"[^>]*>/g, '')
  .replace(/<link[^>]*rel="stylesheet"[^>]*>/g, '');
fs.writeFileSync(indexHtml, newHtml);

console.log('CSS inyectado en JS:', jsName, '| base64 ok | css bytes:', cssBytes, '| js final:', snippet.length + js.length, 'bytes');
console.log('CSS eliminado de assets:', cssName);
console.log('index.html aún referencia css?', /\.css/.test(newHtml));