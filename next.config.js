/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "galaxy-prod.tlcdn.com",
        pathname: "/gen/**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/downloads/the-state-of-fundraising-in-nevada.pdf",
        destination:
          "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/6180041b-130d-4c81-8f29-e9ebafb3a202.pdf",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/legacycall",
        destination: "/services/legacy-giving",
        permanent: true,
      },
      {
        source: "/capitalcampaignservices",
        destination: "/services/capital-campaign",
        permanent: true,
      },
      {
        source: "/annualfundconnect",
        destination: "/services/annual-fund",
        permanent: true,
      },
      {
        source: "/ourteam",
        destination: "/about",
        permanent: true,
      },
      {
        source: "/capacitybuilding",
        destination: "/services/capital-campaign",
        permanent: true,
      },
      {
        source: "/donorengagement",
        destination: "/services/donor-engagement",
        permanent: true,
      },
      {
        source: "/aboutus",
        destination: "/about",
        permanent: true,
      },
      {
        source: "/contactus",
        destination: "/contact",
        permanent: true,
      },
      {
        source: "/testimonials",
        destination: "/results",
        permanent: true,
      },
      {
        source: "/home",
        destination: "/",
        permanent: true,
      },
      {
        source: "/services",
        destination: "/services/capital-campaign",
        permanent: true,
      },
      {
        source: "/mission-and-vision",
        destination: "/",
        permanent: true,
      },
      {
        source: "/newsandevents",
        destination: "/insights",
        permanent: true,
      },
      {
        source: "/contact-10",
        destination: "/contact",
        permanent: true,
      },
      {
        source: "/copy-of-services",
        destination: "/services/capital-campaign",
        permanent: true,
      },
      {
        source: "/campaignconnect",
        destination: "/services/capital-campaign",
        permanent: true,
      },
      {
        source: "/apply-for-job",
        destination: "/apply",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
