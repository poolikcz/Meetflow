# HubSpot Calendar

This repository contains a Next.js + FullCalendar application designed to be used with a HubSpot app card. It fetches meetings, calls and tasks from the HubSpot CRM API and displays them in a calendar view.

## Setup

1. Clone the repo and `cd hubspot-calendar`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a HubSpot app (OAuth) in the developer portal.
4. Create a `.env.local` file in the project root with the following contents:
   ```bash
   HUBSPOT_CLIENT_ID=your_hubspot_client_id
   HUBSPOT_CLIENT_SECRET=your_hubspot_client_secret
   HUBSPOT_REDIRECT_URI=http://localhost:3000/api/oauth/callback
   HUBSPOT_OAUTH_SCOPES="oauth crm.objects.contacts.read crm.objects.meetings.read crm.objects.calls.read crm.objects.tasks.read"
   HUBSPOT_OPTIONAL_SCOPES="crm.objects.owners.read"
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
   Optional fallback for local-only testing without OAuth:
   ```bash
   HUBSPOT_TOKEN=your_private_app_token
   HUBSPOT_PORTAL_ID=1234567
   ```
5. Start development server:
   ```bash
   npm run dev
   ```
6. Open [http://localhost:3000](http://localhost:3000) and click **Connect HubSpot**.

## Deployment
Deploy to Vercel or any platform that supports Next.js and set these environment variables:

- `HUBSPOT_CLIENT_ID`
- `HUBSPOT_CLIENT_SECRET`
- `HUBSPOT_REDIRECT_URI` (e.g. `https://your-domain.vercel.app/api/oauth/callback`)
- `HUBSPOT_OAUTH_SCOPES`
- `HUBSPOT_OPTIONAL_SCOPES` (for example `crm.objects.owners.read`)
- `NEXT_PUBLIC_APP_URL`

## HubSpot Integration
1. Create an app in the HubSpot developers dashboard.
2. Add a UI extension (app card) and set links to your deployed site.
3. Add redirect URL in app auth settings:
   - `https://your-domain.vercel.app/api/oauth/callback`
4. Upload and deploy the HubSpot project from `hubspot-project/` using:
   ```bash
   hs project upload --account <ACCOUNT_ID>
   ```

## License
MIT
