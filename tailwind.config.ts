import type { Config } from "tailwindcss";

export default {
	content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
	presets: [require("nativewind/preset")],
	theme: {
		extend: {
			colors: {
				background: "rgb(var(--color-background) / <alpha-value>)",
				foreground: "rgb(var(--color-foreground) / <alpha-value>)",
				card: {
					DEFAULT: "rgb(var(--color-card) / <alpha-value>)",
					foreground: "rgb(var(--color-card-foreground) / <alpha-value>)",
				},
				primary: {
					DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",
					foreground: "rgb(var(--color-primary-foreground) / <alpha-value>)",
				},
				secondary: {
					DEFAULT: "rgb(var(--color-secondary) / <alpha-value>)",
					foreground: "rgb(var(--color-secondary-foreground) / <alpha-value>)",
				},
				muted: {
					DEFAULT: "rgb(var(--color-muted) / <alpha-value>)",
					foreground: "rgb(var(--color-muted-foreground) / <alpha-value>)",
				},
				accent: {
					DEFAULT: "rgb(var(--color-accent) / <alpha-value>)",
					foreground: "rgb(var(--color-accent-foreground) / <alpha-value>)",
				},
				destructive: {
					DEFAULT: "rgb(var(--color-destructive) / <alpha-value>)",
					foreground:
						"rgb(var(--color-destructive-foreground) / <alpha-value>)",
				},
				border: "rgb(var(--color-border) / <alpha-value>)",
				input: "rgb(var(--color-input) / <alpha-value>)",
				ring: "rgb(var(--color-ring) / <alpha-value>)",
				warning: {
					DEFAULT: "rgb(var(--color-warning) / <alpha-value>)",
					foreground: "rgb(var(--color-warning-foreground) / <alpha-value>)",
				},
				success: {
					DEFAULT: "rgb(var(--color-success) / <alpha-value>)",
					foreground: "rgb(var(--color-success-foreground) / <alpha-value>)",
				},
			},
		},
	},
	plugins: [],
} satisfies Config;
