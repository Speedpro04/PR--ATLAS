/** @type {import('tailwindcss').Config} */

// Os valores aqui sao os MEDIDOS na tela do Atlas, nao os declarados no
// tailwind.config.js dele. O app principal declara Outfit e navy #0F172A;
// a tela mostra Inter e #010c20. Copiar o declarado faria este modulo ficar
// parecido porem diferente — ver PRD 7.1.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          deep: '#010c20', // fundo do body, texto sobre ouro
          main: '#021431', // superficie
          light: '#051b3d', // superficie elevada
        },
        gold: {
          primary: '#c5a059', // botao primario, titulos, foco
          hover: '#b38f4d',
          text: '#e5d5b7',
        },
      },
      fontFamily: {
        // Inter e o que aparece na tela do Atlas. Nada de Outfit.
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
