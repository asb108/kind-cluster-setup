/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    // Use static export for pure client-side rendering
    output: 'export',

    // Static image handling
    images: {
        unoptimized: true
    },

    // Disable server components completely to avoid context issues
    compiler: {
        styledComponents: true
    },

    // Disable experimental features that are causing errors
    experimental: {
        ppr: false,
        optimizeServerReact: false
    }
};

export default nextConfig;
