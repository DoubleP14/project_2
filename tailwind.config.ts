import type { Config } from 'tailwindcss';
import flowbitePlugin from 'flowbite/plugin';

export default {
  // 1. Itt mondjuk meg, hol keresse a dizájn osztályokat
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}'
  ],
  
  // 2. Bekapcsoljuk a sötét módot (osztály alapú)
  darkMode: 'class',
  
  theme: {
    extend: {
      // Itt adunk neki egy szép, modern alapértelmezett kék/lila színt (a Flowbite kéri)
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a'
        }
      }
    }
  },
  
  // 3. Bekötjük magát a Flowbite motort
  plugins: [flowbitePlugin]
} as Config;