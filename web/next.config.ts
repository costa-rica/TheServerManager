import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */

	// Turbopack configuration for SVG (Next.js 16+)
	turbopack: {
		rules: {
			"*.svg": {
				loaders: ["@svgr/webpack"],
				as: "*.js",
			},
		},
	},

	// Webpack configuration for SVG (fallback when using --webpack flag)
	webpack(config) {
		const assetRule = config.module.rules.find((r: unknown) => {
			const rule = r as { test?: { test?: (str: string) => boolean } };
			return rule.test?.test?.(".svg");
		});
		if (assetRule) {
			const typedAssetRule = assetRule as { exclude?: RegExp };
			typedAssetRule.exclude = /\.svg$/i;
		}

		config.module.rules.push({
			test: /\.svg$/i,
			issuer: /\.[jt]sx?$/,
			use: ["@svgr/webpack"],
		});
		return config;
	},
};

export default nextConfig;
