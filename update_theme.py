import re

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# 1. Configurar Tailwind y HTML tag
html = html.replace('tailwind.config = {', "tailwind.config = {\n      darkMode: 'class',")
html = html.replace('<html lang="es" class="scroll-smooth">', '<html lang="es" class="scroll-smooth dark">')

# 2. Body
html = html.replace('bg-[#0f2036] text-[15px] text-white', 'bg-[#FDFCF7] dark:bg-[#0f2036] text-[15px] text-[#0F2A1F] dark:text-white transition-colors duration-[400ms] ease-in-out')

# 3. Hero Overlay
html = html.replace(
  'from-[#081528]/80 via-[#102742]/68 to-[#0f2036]/78',
  'from-[#FDFCF7]/90 via-[#FDFCF7]/60 to-transparent dark:from-[#081528]/80 dark:via-[#102742]/68 dark:to-[#0f2036]/78 transition-colors duration-[400ms] ease-in-out'
)

# 4. Navbar y Botón Toggle
html = html.replace(
  'border-white/15 bg-white/10 text-white backdrop-blur-md',
  'border-[#0F2A1F]/10 dark:border-white/15 bg-white/60 dark:bg-white/10 text-[#0F2A1F] dark:text-white backdrop-blur-md transition-colors duration-[400ms] ease-in-out'
)
html = html.replace(
  '<a href="#clientes" class="rounded-md px-3 py-2 text-white transition hover:bg-white/15">Clientes</a>',
  '<a href="#clientes" class="rounded-md px-3 py-2 text-[#0F2A1F] dark:text-white transition hover:bg-[#0F2A1F]/10 dark:hover:bg-white/15">Clientes</a>\n          <button id="themeToggleNav" class="ml-4 flex items-center gap-2 rounded-full border border-[#0F2A1F]/20 dark:border-white/20 bg-white/40 dark:bg-black/20 px-4 py-2 text-sm font-semibold text-[#0F2A1F] dark:text-white backdrop-blur-md transition-all duration-[400ms] hover:bg-white/70 dark:hover:bg-black/40 shadow-sm"><span class="theme-icon">☾</span><span class="theme-text">Oscuro</span></button>'
)

html = re.sub(r'text-white transition hover:bg-white/15', r'text-[#0F2A1F] dark:text-white transition-all duration-[400ms] hover:bg-[#0F2A1F]/10 dark:hover:bg-white/15', html)
html = re.sub(r'border-white/40 px-3 py-2 text-white transition hover:bg-white/15', r'border-[#0F2A1F]/40 dark:border-white/40 px-3 py-2 text-[#0F2A1F] dark:text-white transition-all duration-[400ms] hover:bg-[#0F2A1F]/10 dark:hover:bg-white/15', html)
html = re.sub(r'text-white sm:text-lg">Catálogo General', r'text-[#0F2A1F] dark:text-white sm:text-lg">Catálogo General', html)

# 5. Mobile Menu
html = html.replace(
  'bg-black/60 backdrop-blur-3xl transition-all duration-500',
  'bg-[#FDFCF7]/90 dark:bg-black/60 backdrop-blur-3xl transition-all duration-[400ms]'
)
html = html.replace(
  '<button onclick="document.getElementById(\'login\').scrollIntoView({behavior:\'smooth\'}); cerrarMenuMovil();" class="rounded-full border border-white/30 px-8 py-3 font-semibold text-white transition-all duration-300 hover:bg-white/10">\n        Login\n      </button>',
  '<button onclick="document.getElementById(\'login\').scrollIntoView({behavior:\'smooth\'}); cerrarMenuMovil();" class="rounded-full border border-[#0F2A1F]/30 dark:border-white/30 px-8 py-3 font-semibold text-[#0F2A1F] dark:text-white transition-all duration-[400ms] hover:bg-[#0F2A1F]/10 dark:hover:bg-white/10">\n        Login\n      </button>\n      <button id="themeToggleMobile" class="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-[#0F2A1F]/20 dark:border-white/20 bg-white/40 dark:bg-black/20 px-8 py-4 font-semibold text-[#0F2A1F] dark:text-white backdrop-blur-md transition-all duration-[400ms] hover:bg-white/70 dark:hover:bg-black/40 text-xl"><span class="theme-icon">☾</span><span class="theme-text">Modo Oscuro</span></button>'
)

html = re.sub(r'text-white transition-all duration-300 hover:text-alborada-gold', r'text-[#0F2A1F] dark:text-white transition-all duration-[400ms] hover:text-alborada-gold', html)
html = re.sub(r'text-4xl text-white">×', r'text-4xl text-[#0F2A1F] dark:text-white transition-colors duration-[400ms]">×', html)

# 6. Typographies (Text colors)
html = re.sub(r'text-white sm:text-6xl md:text-7xl', r'text-[#0F2A1F] dark:text-white sm:text-6xl md:text-7xl transition-colors duration-[400ms]', html)
html = re.sub(r'text-white md:text-5xl', r'text-[#0F2A1F] dark:text-white md:text-5xl transition-colors duration-[400ms]', html)
html = re.sub(r'text-white sm:text-2xl', r'text-[#0F2A1F] dark:text-white sm:text-2xl transition-colors duration-[400ms]', html)
html = re.sub(r'text-2xl text-white', r'text-2xl text-[#0F2A1F] dark:text-white transition-colors duration-[400ms]', html)

html = re.sub(r'text-white/90', r'text-[#4A4636] dark:text-white/90 transition-colors duration-[400ms]', html)
html = re.sub(r'text-white/80', r'text-[#4A4636] dark:text-white/80 transition-colors duration-[400ms]', html)
html = re.sub(r'text-gray-300', r'text-[#4A4636] dark:text-gray-300 transition-colors duration-[400ms]', html)
html = re.sub(r'text-gray-400', r'text-[#4A4636] dark:text-gray-400 transition-colors duration-[400ms]', html)
html = re.sub(r'text-gray-200', r'text-[#0F2A1F] dark:text-gray-200 transition-colors duration-[400ms]', html)

html = html.replace(
  'border-2 border-white px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-white/15',
  'border-2 border-[#0F2A1F] dark:border-white px-6 py-3 text-sm font-bold uppercase tracking-wide text-[#0F2A1F] dark:text-white transition-all duration-[400ms] hover:bg-[#0F2A1F]/10 dark:hover:bg-white/15'
)

# 7. Cards & Frosted Glass
dark_glass = 'border border-white/10 bg-white/5 shadow-2xl shadow-[#071426]/35 backdrop-blur-md'
light_glass = 'border border-[#0F2A1F]/10 bg-white/70 shadow-md shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-2xl dark:shadow-[#071426]/35 dark:backdrop-blur-md transition-all duration-[400ms]'
html = html.replace(dark_glass, light_glass)

# Table backgrounds
html = html.replace('bg-[#0f2239]/45', 'bg-white/50 dark:bg-[#0f2239]/45 transition-colors duration-[400ms]')
html = html.replace('bg-white/10 text-white', 'bg-[#0F2A1F]/5 dark:bg-white/10 text-[#0F2A1F] dark:text-white transition-colors duration-[400ms]')
html = re.sub(r'hover:bg-white/5', r'hover:bg-[#0F2A1F]/5 dark:hover:bg-white/5 transition-colors duration-[400ms]', html)

# Contact Cards
html = re.sub(r'bg-\[#102742\]/35', r'bg-white/60 dark:bg-[#102742]/35 transition-colors duration-[400ms]', html)
html = re.sub(r'bg-\[#163557\]/52', r'bg-white/80 dark:bg-[#163557]/52 transition-colors duration-[400ms]', html)
html = re.sub(r'text-white group-hover:text-alborada-gold', r'text-[#0F2A1F] dark:text-white group-hover:text-alborada-gold transition-colors duration-[400ms]', html)

# Form Inputs
html = re.sub(r'border-white/15 bg-\[#102742\]/45 px-4 py-3 text-white', r'border-[#0F2A1F]/20 dark:border-white/15 bg-white/60 dark:bg-[#102742]/45 px-4 py-3 text-[#0F2A1F] dark:text-white transition-colors duration-[400ms]', html)

# Footer
html = html.replace('border-t border-white/10 bg-[#091525]/75 px-5 py-6 text-center text-white', 'border-t border-[#0F2A1F]/10 dark:border-white/10 bg-[#FDFCF7]/90 dark:bg-[#091525]/75 px-5 py-6 text-center text-[#0F2A1F] dark:text-white transition-colors duration-[400ms]')

# Additional card background fixes
html = re.sub(r'border-white/25 bg-white/5', r'border-[#0F2A1F]/20 dark:border-white/25 bg-white/50 dark:bg-white/5 transition-colors duration-[400ms]', html)
html = re.sub(r'hover:bg-white/15 hover:shadow-lg sm:w-auto">Cerrar sesión', r'hover:bg-[#0F2A1F]/10 dark:hover:bg-white/15 hover:shadow-lg sm:w-auto">Cerrar sesión', html)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print("HTML actualizado con Python!")
