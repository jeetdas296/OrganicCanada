const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

/**
 * Medusa Cloud-related environment variables
 */
const S3_HOSTNAME = process.env.MEDUSA_CLOUD_S3_HOSTNAME
const S3_PATHNAME = process.env.MEDUSA_CLOUD_S3_PATHNAME

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.us-east-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "t4.ftcdn.net",
      },
      {
        protocol: "https",
        hostname: "5.imimg.com",
      },
      {
        protocol: "https",
        hostname: "img.freepik.com",
      },
      {
        protocol: "https",
        hostname: "i5.walmartimages.com", // 👈 Add this new block!
      },
      {
        protocol: "https",
        hostname: "**", // 👈 The magic wildcard for ALL secure websites
      },
      {
        protocol: "http",
        hostname: "**", // 👈 The magic wildcard for ALL insecure websites
      },
      {
        protocol: "https",
        hostname: "www.cookitrealgood.com", // 👈 Add this new domain!
      },
      {
        protocol: 'https',
        hostname: 'www.nutritionfact.in',
      },
      {
        protocol: "https",
        hostname: "tiimg.tistatic.com",
      },
      {
        protocol: "https",
        hostname: "insanelygoodrecipes.com", // Your Garam Masala image
      },
      // You can add more domains here if you use other image sources later!
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      ...(S3_HOSTNAME && S3_PATHNAME
        ? [
            {
              protocol: "https",
              hostname: S3_HOSTNAME,
              pathname: S3_PATHNAME,
            },
          ]
        : []),
    ],
  },
}

module.exports = nextConfig
