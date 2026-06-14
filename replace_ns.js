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
  { pattern: /NS Store/gi, replacement: 'Smartlover' },
  { pattern: /ns-store/gi, replacement: 'smartlover' },
  { pattern: /info@nsstore\.com/gi, replacement: 'support@smartlover.lk' },
  { pattern: /nsstore/gi, replacement: 'smartlover' },
  { pattern: /ns store/gi, replacement: 'smartlover' }
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
