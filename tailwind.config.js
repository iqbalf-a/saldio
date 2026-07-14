/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [ 
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
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
