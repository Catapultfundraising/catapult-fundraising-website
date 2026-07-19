# Catapult Fundraising Website

Built with Next.js 15 + Tailwind CSS + shadcn/ui.

## Development

```bash
npm install
npm run dev
```

## Environment Variables

- `HUBSPOT_PRIVATE_APP_TOKEN` — HubSpot Private App access token, used by `/app/api/contact/route.ts` to sync contact-form leads into HubSpot as contacts.
