/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'aws-orange': '#FF9900',
        'aws-dark-orange': '#E67E00',
        'aws-blue': '#146EB4',
        'aws-dark-blue': '#0F4C75',
        'aws-gray': '#232F3E',
        'aws-light-gray': '#F2F3F3',
        'aws-dark-gray': '#16191F',
      }
    },
  },
  plugins: [],
}
