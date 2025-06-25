/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,

    // Next.js 15.3 specific options
    experimental: {
        // Disable Partial Prerendering (PPR) which is causing errors
        ppr: false,

        // Enable optimized server components
        optimizeServerReact: true,

        // Ensure error boundaries work correctly
        serverActions: {
            bodySizeLimit: '2mb',
        },

        // Modern React features configuration
        // useDeploymentId has been removed in Next.js 15.3

        // Enable modern image optimization
        optimizePackageImports: ['lucide-react'],
    },

    // Ensure CSS is processed properly
    sassOptions: {
        includePaths: ['./styles'],
    },

    // Static image handling for export mode
    images: {
        unoptimized: true,
        // Add modern image formats
        formats: ['image/avif', 'image/webp'],
    },

    // Improved error handling
    logging: {
        fetches: {
            fullUrl: true,
        },
    },

    // Use static export for pure client-side rendering
    output: 'export',

    // Properly handle error pages
    onDemandEntries: {
        // Keep error pages in memory longer
        maxInactiveAge: 60 * 60 * 1000,
        // Increase page buffer to ensure error pages are available
        pagesBufferLength: 5,
    },
};

export default nextConfig;