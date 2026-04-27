const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Configurar Tailwind y HTML tag
html = html.replace('tailwind.config = {', "tailwind.config = {\n      darkMode: 'class',");
html = html.replace('<html lang="es" class="scroll-smooth">', '<html lang="es" class="scroll-smooth dark">');

// 2. Body
html = html.replace('bg-[#0f2036] text-[15px] text-white', 'bg-[#FDFCF7] dark:bg-[#0f2036] text-[15px] text-[#0F2A1F] dark:text-white transition-colors duration-[400ms] ease-in-out');

// 3. Hero Overlay
html = html.replace(
  'from-[#081528]/80 via-[#102742]/68 to-[#0f2036]/78',
  'from-[#FDFCF7]/90 via-[#FDFCF7]/60 to-transparent dark:from-[#081528]/80 dark:via-[#102742]/68 dark:to-[#0f2036]/78 transition-colors duration-[400ms] ease-in-out'
);

// 4. Navbar y Botón Toggle
html = html.replace(
  'border-white/15 bg-white/10 text-white backdrop-blur-md',
  'border-[#0F2A1F]/10 dark:border-white/15 bg-white/60 dark:bg-white/10 text-[#0F2A1F] dark:text-white backdrop-blur-md transition-colors duration-[400ms] ease-in-out'
);
html = html.replace(
  '<a href="#clientes" class="rounded-md px-3 py-2 text-white transition hover:bg-white/15">Clientes</a>',
  '<a href="#clientes" class="rounded-md px-3 py-2 text-[#0F2A1F] dark:text-white transition hover:bg-[#0F2A1F]/10 dark:hover:bg-white/15">Clientes</a>\n          <button id="themeToggleNav" class="ml-4 flex items-center gap-2 rounded-full border border-[#0F2A1F]/20 dark:border-white/20 bg-white/50 dark:bg-black/20 px-4 py-2 text-sm font-semibold text-[#0F2A1F] dark:text-white backdrop-blur-md transition-all duration-[400ms] hover:bg-white/70 dark:hover:bg-black/40 shadow-sm"><span class="theme-icon">☾</span><span class="theme-text">Oscuro</span></button>'
);
html = html.replace(/text-white transition hover:bg-white\/15/g, 'text-[#0F2A1F] dark:text-white transition-all duration-[400ms] hover:bg-[#0F2A1F]/10 dark:hover:bg-white/15');
html = html.replace(/border-white\/40 px-3 py-2 text-white transition hover:bg-white\/15/g, 'border-[#0F2A1F]/40 dark:border-white/40 px-3 py-2 text-[#0F2A1F] dark:text-white transition-all duration-[400ms] hover:bg-[#0F2A1F]/10 dark:hover:bg-white/15');
html = html.replace(/text-white sm:text-lg">Catálogo General/g, 'text-[#0F2A1F] dark:text-white sm:text-lg">Catálogo General');


// 5. Mobile Menu
html = html.replace(
  'bg-black/60 backdrop-blur-3xl transition-all duration-500',
  'bg-[#FDFCF7]/90 dark:bg-black/60 backdrop-blur-3xl transition-all duration-[400ms]'
);
html = html.replace(
  '<button onclick="document.getElementById(\'login\').scrollIntoView({behavior:\'smooth\'}); cerrarMenuMovil();" class="rounded-full border border-white/30 px-8 py-3 font-semibold text-white transition-all duration-300 hover:bg-white/10">\n        Login\n      </button>',
  '<button onclick="document.getElementById(\'login\').scrollIntoView({behavior:\'smooth\'}); cerrarMenuMovil();" class="rounded-full border border-[#0F2A1F]/30 dark:border-white/30 px-8 py-3 font-semibold text-[#0F2A1F] dark:text-white transition-all duration-300 hover:bg-[#0F2A1F]/10 dark:hover:bg-white/10">\n        Login\n      </button>\n      <button id="themeToggleMobile" class="mt-4 flex items-center justify-center gap-2 rounded-full border border-[#0F2A1F]/20 dark:border-white/20 bg-white/50 dark:bg-black/20 px-8 py-4 font-semibold text-[#0F2A1F] dark:text-white backdrop-blur-md transition-all duration-[400ms] hover:bg-white/70 dark:hover:bg-black/40 text-xl"><span class="theme-icon">☾</span><span class="theme-text">Modo Oscuro</span></button>'
);
html = html.replace(/text-white transition-all duration-300 hover:text-alborada-gold/g, 'text-[#0F2A1F] dark:text-white transition-all duration-[400ms] hover:text-alborada-gold');
html = html.replace(/text-4xl text-white">×<\/button>/g, 'text-4xl text-[#0F2A1F] dark:text-white transition-colors duration-[400ms]">×</button>');


// 6. Typographies (Text colors)
// H1, H2, H3
html = html.replace(/text-white sm:text-6xl md:text-7xl/g, 'text-[#0F2A1F] dark:text-white sm:text-6xl md:text-7xl transition-colors duration-[400ms]');
html = html.replace(/text-white md:text-5xl/g, 'text-[#0F2A1F] dark:text-white md:text-5xl transition-colors duration-[400ms]');
html = html.replace(/text-white sm:text-2xl/g, 'text-[#0F2A1F] dark:text-white sm:text-2xl transition-colors duration-[400ms]');
html = html.replace(/text-2xl text-white/g, 'text-2xl text-[#0F2A1F] dark:text-white transition-colors duration-[400ms]');
// Paragraphs & Subtitles
html = html.replace(/text-white\/90/g, 'text-[#4A4636] dark:text-white/90 transition-colors duration-[400ms]');
html = html.replace(/text-white\/80/g, 'text-[#4A4636] dark:text-white/80 transition-colors duration-[400ms]');
html = html.replace(/text-gray-300/g, 'text-[#4A4636] dark:text-gray-300 transition-colors duration-[400ms]');
html = html.replace(/text-gray-400/g, 'text-[#4A4636] dark:text-gray-400 transition-colors duration-[400ms]');
html = html.replace(/text-gray-200/g, 'text-[#0F2A1F] dark:text-gray-200 transition-colors duration-[400ms]');
// Specific buttons in hero
html = html.replace('border-2 border-white px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-white/15', 'border-2 border-[#0F2A1F] dark:border-white px-6 py-3 text-sm font-bold uppercase tracking-wide text-[#0F2A1F] dark:text-white transition-all duration-[400ms] hover:bg-[#0F2A1F]/10 dark:hover:bg-white/15');

// 7. Cards & Frosted Glass
const darkGlass = 'border border-white/10 bg-white/5 shadow-2xl shadow-[#071426]/35 backdrop-blur-md';
const lightGlass = 'border border-[#0F2A1F]/10 bg-white/70 shadow-sm shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-2xl dark:shadow-[#071426]/35 dark:backdrop-blur-md transition-all duration-[400ms]';
html = html.split(darkGlass).join(lightGlass);

// Table backgrounds
html = html.replace('bg-[#0f2239]/45', 'bg-white/50 dark:bg-[#0f2239]/45 transition-colors duration-[400ms]');
html = html.replace('bg-white/10 text-white', 'bg-[#0F2A1F]/5 dark:bg-white/10 text-[#0F2A1F] dark:text-white transition-colors duration-[400ms]');
html = html.replace(/hover:bg-white\/5/g, 'hover:bg-[#0F2A1F]/5 dark:hover:bg-white/5 transition-colors duration-[400ms]');

// Contact Cards
html = html.replace(/bg-\[#102742\]\/35/g, 'bg-white/60 dark:bg-[#102742]/35 transition-colors duration-[400ms]');
html = html.replace(/bg-\[#163557\]\/52/g, 'bg-white/80 dark:bg-[#163557]/52 transition-colors duration-[400ms]');
html = html.replace(/text-white group-hover:text-alborada-gold/g, 'text-[#0F2A1F] dark:text-white group-hover:text-alborada-gold transition-colors duration-[400ms]');

// Form Inputs
html = html.replace(/border-white\/15 bg-\[#102742\]\/45 px-4 py-3 text-white/g, 'border-[#0F2A1F]/20 dark:border-white/15 bg-white/60 dark:bg-[#102742]/45 px-4 py-3 text-[#0F2A1F] dark:text-white transition-colors duration-[400ms]');

// Footer
html = html.replace('border-t border-white/10 bg-[#091525]/75 px-5 py-6 text-center text-white', 'border-t border-[#0F2A1F]/10 dark:border-white/10 bg-[#FDFCF7]/90 dark:bg-[#091525]/75 px-5 py-6 text-center text-[#0F2A1F] dark:text-white transition-colors duration-[400ms]');

// Additional card background fixes
html = html.replace(/border-white\/25 bg-white\/5/g, 'border-[#0F2A1F]/20 dark:border-white/25 bg-white/50 dark:bg-white/5 transition-colors duration-[400ms]');
html = html.replace(/hover:bg-white\/15 hover:shadow-lg sm:w-auto">Cerrar sesión/g, 'hover:bg-[#0F2A1F]/10 dark:hover:bg-white/15 hover:shadow-lg sm:w-auto">Cerrar sesión');

fs.writeFileSync('index.html', html);
console.log("HTML actualizado correctamente.");
