import fs from 'fs';

const content = fs.readFileSync('c:/wamp64/www/e-Menu/frontend/src/views/AdminView.vue', 'utf8');

// Find all modal templates
const modalMatches = [...content.matchAll(/class=['"]([^'"]*modal[^'"]*)['"]/gi)].map(m => m[1]);
console.log('Unique modal class names:', [...new Set(modalMatches)]);

// Find tab buttons and nav items
const tabMatches = [...content.matchAll(/class=['"]([^'"]*tab[^'"]*)['"]/gi)].map(m => m[1]);
console.log('Unique tab class names:', [...new Set(tabMatches)].slice(0, 20));

// Find close buttons
const closeMatches = [...content.matchAll(/class=['"]([^'"]*close[^'"]*)['"]/gi)].map(m => m[1]);
console.log('Unique close class names:', [...new Set(closeMatches)]);
