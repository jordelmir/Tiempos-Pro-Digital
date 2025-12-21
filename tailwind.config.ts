import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                cyber: {
                    black: '#02040a',
                    dark: '#050a14',
                    panel: '#0a1124',
                    border: '#1e3a8a',
                    neon: '#00f0ff',
                    purple: '#bc13fe',
                    orange: '#ff5f00',
                    blue: '#2463eb',
                    emerald: '#10b981',
                    'emerald-dark': '#064e3b',
                    danger: '#ff003c',
                    success: '#0aff60',
                    solar: '#ff5f00',
                    vapor: '#7c3aed',
                    abyss: '#1e3a8a'
                },
                background: "var(--background)",
                foreground: "var(--foreground)",
            },
            fontFamily: {
                sans: ['Rajdhani', 'sans-serif'],
                display: ['Orbitron', 'sans-serif'],
                mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
            },
            boxShadow: {
                'neon-cyan': '0 0 5px #00f0ff, 0 0 20px rgba(0, 240, 255, 0.4), inset 0 0 10px rgba(0, 240, 255, 0.1)',
                'neon-purple': '0 0 5px #bc13fe, 0 0 20px rgba(188, 19, 254, 0.4), inset 0 0 10px rgba(188, 19, 254, 0.1)',
                'neon-orange': '0 0 5px #ff5f00, 0 0 20px rgba(255, 95, 0, 0.4), inset 0 0 10px rgba(255, 95, 0, 0.1)',
                'neon-blue': '0 0 10px #2463eb, 0 0 30px rgba(36, 99, 235, 0.5), inset 0 0 15px rgba(36, 99, 235, 0.2)',
                'neon-emerald': '0 0 20px #10b981, 0 0 80px rgba(16, 185, 129, 0.9), inset 0 0 30px rgba(16, 185, 129, 0.5)',
                'neon-red': '0 0 5px #ff003c, 0 0 30px rgba(255, 0, 60, 0.5), inset 0 0 10px rgba(255, 0, 60, 0.2)',
                'neon-green': '0 0 5px #0aff60, 0 0 20px rgba(10, 255, 96, 0.4), inset 0 0 10px rgba(10, 255, 96, 0.1)',
                'neon-solar': '0 0 10px #ff5f00, 0 0 40px rgba(255, 95, 0, 0.6), inset 0 0 20px rgba(255, 95, 0, 0.2)',
                'neon-vapor': '0 0 10px #7c3aed, 0 0 40px rgba(124, 58, 237, 0.5), inset 0 0 20px rgba(124, 58, 237, 0.2)',
                'neon-abyss': '0 0 15px #1e3a8a, 0 0 60px rgba(30, 58, 138, 0.6), inset 0 0 30px rgba(30, 58, 138, 0.3)',
            },
        },
    },
    plugins: [],
};
export default config;
