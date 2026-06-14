const fs = require('fs');
const path = require('path');

const walk = (dir, done) => {
  let results = [];
  fs.readdir(dir, (err, list) => {
    if (err) return done(err);
    let pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(file => {
      file = path.resolve(dir, file);
      if (file.includes('node_modules')) {
        if (!--pending) done(null, results);
        return;
      }
      fs.stat(file, (err, stat) => {
        if (stat && stat.isDirectory()) {
          walk(file, (err, res) => {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
};

const replacements = [
  { pattern: /ZAGE FASHION CORNER/g, replacement: 'SMARTLOVER' },
  { pattern: /Zage Fashion Corner/gi, replacement: 'Smartlover' },
  { pattern: /Zage Admin Panel/gi, replacement: 'Smartlover Admin Panel' },
  { pattern: /Zage Brand Dashboard/gi, replacement: 'Smartlover Dashboard' },
  { pattern: /Zage Boutique/gi, replacement: 'Smartlover Boutique' },
  { pattern: /Zage Atelier Colombo/gi, replacement: 'Smartlover Kadawatha' },
  { pattern: /zagebeauty\.com/gi, replacement: 'smartlover.lk' },
  { pattern: /zage\.lk/gi, replacement: 'smartlover.lk' },
  { pattern: /zagebeauty/gi, replacement: 'smartlover' },
  { pattern: /zage_/g, replacement: 'smartlover_' },
  { pattern: /Zage/g, replacement: 'Smartlover' },
  { pattern: /\+94 11 255 5000/g, replacement: '0765318012' },
  { pattern: /88 Fashion Avenue, Colombo 03/g, replacement: '411/1/B,Kandy RD,kadawatha' }
];

const processFiles = (results) => {
  results.forEach(file => {
    if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.html')) {
      let content = fs.readFileSync(file, 'utf8');
      let originalContent = content;
      replacements.forEach(({ pattern, replacement }) => {
        content = content.replace(pattern, replacement);
      });
      if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${file}`);
      }
    }
  });
};

walk('d:/downloads/zage/frontend/src', (err, frontendResults) => {
  if (err) throw err;
  frontendResults.push(path.resolve('d:/downloads/zage/frontend/index.html'));
  processFiles(frontendResults);
});

walk('d:/downloads/zage/backend', (err, backendResults) => {
  if (err) throw err;
  processFiles(backendResults);
});
