const fs = require('fs');
const path = require('path');

const replacements = [
  { from: /bg-\[#07070b\]/g, to: 'bg-gray-50' },
  { from: /bg-\[#0a0a0f\]/g, to: 'bg-white' },
  { from: /bg-[#0f0f17]/g, to: 'bg-white' },
  { from: /border-white\/\[0\.06\]/g, to: 'border-gray-200' },
  { from: /border-white\/\[0\.04\]/g, to: 'border-gray-200' },
  { from: /border-white\/\[0\.03\]/g, to: 'border-gray-100' },
  { from: /border-white\/\[0\.08\]/g, to: 'border-gray-300' },
  { from: /border-white\/\[0\.1\]/g, to: 'border-gray-300' },
  { from: /border-white\/\[0\.12\]/g, to: 'border-gray-300' },
  { from: /border-white\/10/g, to: 'border-gray-300' },
  { from: /bg-white\/\[0\.02\]/g, to: 'bg-white' },
  { from: /bg-white\/\[0\.03\]/g, to: 'bg-gray-50' },
  { from: /bg-white\/\[0\.04\]/g, to: 'bg-gray-100' },
  { from: /bg-white\/\[0\.05\]/g, to: 'bg-gray-100' },
  { from: /bg-white\/\[0\.06\]/g, to: 'bg-gray-100' },
  { from: /bg-white\/\[0\.08\]/g, to: 'bg-gray-200' },
  { from: /bg-white\/\[0\.1\]/g, to: 'bg-gray-200' },
  { from: /text-white\/20/g, to: 'text-gray-400' },
  { from: /text-white\/25/g, to: 'text-gray-400' },
  { from: /text-white\/30/g, to: 'text-gray-500' },
  { from: /text-white\/35/g, to: 'text-gray-500' },
  { from: /text-white\/40/g, to: 'text-gray-500' },
  { from: /text-white\/50/g, to: 'text-gray-600' },
  { from: /text-white\/60/g, to: 'text-gray-600' },
  { from: /text-white\/70/g, to: 'text-gray-700' },
  { from: /text-white\/80/g, to: 'text-gray-800' },
  { from: /text-white\/85/g, to: 'text-gray-800' },
  { from: /text-white\/90/g, to: 'text-gray-900' },
  { from: /text-white/g, to: 'text-gray-900' },
  // Wait, if I replace `text-white` I might mess up buttons that need white text on primary background.
  // I'll do this carefully. 
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;

  replacements.forEach(({from, to}) => {
    newContent = newContent.replace(from, to);
  });

  // Some targeted fixes for buttons that should remain white text
  newContent = newContent.replace(/text-gray-900 font-bold text-sm/g, 'text-white font-bold text-sm'); // logo text
  newContent = newContent.replace(/text-gray-900 text-xs font-semibold/g, 'text-white text-xs font-semibold'); // avatar text
  newContent = newContent.replace(/bg-indigo-500 hover:bg-indigo-600 text-gray-900/g, 'bg-indigo-500 hover:bg-indigo-600 text-white'); // buttons
  newContent = newContent.replace(/bg-indigo-500 text-gray-900/g, 'bg-indigo-500 text-white'); // buttons
  newContent = newContent.replace(/bg-emerald-500 text-\[10px\] font-bold text-gray-900/g, 'bg-indigo-500 text-[10px] font-bold text-white'); // notification badges

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    console.log('Updated:', filePath);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  });
}

walk(path.join(__dirname, 'app/dashboard'));
walk(path.join(__dirname, 'components/dashboard'));
