/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [ 
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Skala tipografi kompak — layar HP terasa lega, sesuai arah desain
      fontSize: {
        xs: ["11px", { lineHeight: "15px" }],
        sm: ["13px", { lineHeight: "18px" }],
        base: ["14px", { lineHeight: "20px" }],
        lg: ["16px", { lineHeight: "22px" }],
        xl: ["18px", { lineHeight: "24px" }],
        "2xl": ["20px", { lineHeight: "26px" }],
        "3xl": ["24px", { lineHeight: "30px" }],
      },
      colors: {
        saldio: {
          // Light mode (default)
          navy: "#1E2A78",
          blue: "#3D51E0",
          sky: "#EAEFFB",
          bg: "#F1F4F9",
          ink: "#101736",
          muted: "#8A94A6",
          soft: "#64748B",
          border: "#E6EAF2",
          green: "#16A34A",
          "green-bg": "#E7F6EC",
          red: "#E23B3B",
          "red-bg": "#FDECEC",
          gold: "#B08415",
          "gold-deep": "#8A6A10",
          "gold-bg": "#FBF3DC",
          "gold-ink": "#6B5308",
          // Dark mode overrides — pakai dengan dark: prefix
          // Contoh: dark:bg-saldio-darkBg, dark:text-saldio-darkInk
          "dark-bg": "#0F1123",
          "dark-card": "#181E36",
          "dark-ink": "#E8ECF4",
          "dark-muted": "#8892A6",
          "dark-soft": "#6B7589",
          "dark-border": "#1E2540",
          "dark-sky": "#5B6FE8",
          "dark-blue": "#5B6FE8",
          "dark-red": "#F06060",
          "dark-red-bg": "#3D1515",
          "dark-green": "#3DCE7E",
          "dark-green-bg": "#1A3D2A",
          "dark-gold": "#D4A843",
          "dark-gold-bg": "#2E2610",
          "dark-gold-ink": "#C4A44A",
        },
      },
      fontFamily: {
        sans: ["Geist_400Regular"],
        "sans-medium": ["Geist_500Medium"],
        "sans-semibold": ["Geist_600SemiBold"],
        "sans-bold": ["Geist_700Bold"],
        mono: ["GeistMono_400Regular"],
        "mono-medium": ["GeistMono_500Medium"],
        "mono-semibold": ["GeistMono_600SemiBold"],
        "mono-bold": ["GeistMono_700Bold"],
      }, 
    },
  },
  plugins: [],
};
