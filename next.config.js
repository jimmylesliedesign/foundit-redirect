module.exports = {
  // Add any Next.js configuration options here
  // e.g., redirects, rewrites, etc.
  env: {
    // Expose environment variables to the client-side
    AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID,
    AIRTABLE_TOKEN: process.env.AIRTABLE_TOKEN,
  },
  // Vercel-specific configuration
  rewrites: async () => {
    return [
      {
        source: '/:tagId',
        destination: '/api/[tagId]',
      },
    ];
  },
};
