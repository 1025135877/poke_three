/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,html}"
    ],
    theme: {
        extend: {
            colors: {
                // Material Design 色调映射 — 从 UI 设计稿提取
                "primary": "#6e5900",
                "primary-container": "#fdd000",
                "primary-dim": "#604e00",
                "on-primary": "#fff2d1",
                "on-primary-container": "#584700",
                "on-primary-fixed-variant": "#635100",
                "primary-fixed": "#fce37a",
                "primary-fixed-dim": "#dfc562",

                "secondary": "#b61321",
                "secondary-container": "#ffc3be",
                "secondary-fixed": "#ffdad6",
                "secondary-fixed-dim": "#ffb3ad",
                "on-secondary": "#ffefee",
                "on-secondary-container": "#930012",
                "on-secondary-fixed-variant": "#a60018",

                "tertiary": "#006b1b",
                "tertiary-container": "#7af974",
                "tertiary-dim": "#005d16",
                "tertiary-fixed": "#91f78e",
                "on-tertiary": "#e0ffe0",
                "on-tertiary-container": "#004d12",
                "on-tertiary-fixed": "#00480f",
                "on-tertiary-fixed-variant": "#015e15",

                "surface": "#fcf6e3",
                "surface-dim": "#dbd5bc",
                "surface-bright": "#fcf6e3",
                "surface-container": "#f5efd9",
                "surface-container-low": "#f8f2de",
                "surface-container-high": "#ede8d1",
                "surface-container-highest": "#e7e1ca",
                "surface-variant": "#e3ddc5",
                "on-surface": "#312f23",
                "on-surface-variant": "#5f5c4d",

                "background": "#fcf6e3",
                "on-background": "#312f23",

                "outline": "#7a7768",
                "outline-variant": "#cdc7ad",

                "inverse-surface": "#100e05",
                "inverse-on-surface": "#a19d8c",
                "inverse-primary": "#dfc562",

                "error": "#ba1a1a",
                "error-container": "#ffdad6"
            },
            fontFamily: {
                "headline": ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
                "body": ["'Be Vietnam Pro'", "system-ui", "sans-serif"],
                "label": ["'Be Vietnam Pro'", "system-ui", "sans-serif"]
            },
            borderRadius: {
                "DEFAULT": "1rem",
                "lg": "2rem",
                "xl": "3rem",
                "full": "9999px"
            },
            spacing: {
                "18": "4.5rem",
                "88": "22rem"
            },
            animation: {
                "bounce-in": "bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
                "pulse-glow": "pulseGlow 2s ease-in-out infinite",
                "float": "float 3s ease-in-out infinite",
                "slide-up": "slideUp 0.4s ease-out",
                "card-flip": "cardFlip 0.6s ease-in-out",
                "chip-drop": "chipDrop 0.5s ease-out"
            },
            keyframes: {
                bounceIn: {
                    "0%": { transform: "scale(0.3)", opacity: "0" },
                    "50%": { transform: "scale(1.05)" },
                    "70%": { transform: "scale(0.9)" },
                    "100%": { transform: "scale(1)", opacity: "1" }
                },
                pulseGlow: {
                    "0%, 100%": { boxShadow: "0 0 5px rgba(253, 208, 0, 0.3)" },
                    "50%": { boxShadow: "0 0 20px rgba(253, 208, 0, 0.6)" }
                },
                float: {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-10px)" }
                },
                slideUp: {
                    "0%": { transform: "translateY(30px)", opacity: "0" },
                    "100%": { transform: "translateY(0)", opacity: "1" }
                },
                cardFlip: {
                    "0%": { transform: "rotateY(0deg)" },
                    "100%": { transform: "rotateY(180deg)" }
                },
                chipDrop: {
                    "0%": { transform: "translateY(-50px)", opacity: "0" },
                    "100%": { transform: "translateY(0)", opacity: "1" }
                }
            }
        }
    },
    plugins: []
}
