/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'gold-ak': '#CBA052',
        'charcoal': '#2C2C2C',
        'silk': '#F2EBE3',
        'canvas': '#FFFFFF',
        'ice': '#F5F7FA',
        'line': '#E0E0E0',
        'gray-medium': '#9E9E9E',
        'emerald-success': '#008F7A',
        'emerald-light': '#E6F7F4',
        'amber-warning': '#D48806',
        'amber-light': '#FFF7E6',
        'ruby-critical': '#C0392B',
        'ruby-light': '#F9EBEB',
        'sapphire-info': '#4A90E2',
      },
    },
  },
  plugins: [],
};
