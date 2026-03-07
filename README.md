# HubSpot Calendar

This repository contains a minimal Next.js + FullCalendar application designed to be embedded in HubSpot via a UI Extension. It fetches meetings, calls and tasks from the HubSpot CRM API and displays them in a calendar view.

## Setup

1. Clone the repo and `cd hubspot-calendar`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a private app in your HubSpot portal and copy the token.
4. Create a `.env.local` file in the project root with the following contents:
   ```bash
   HUBSPOT_TOKEN=your_private_app_token
   HUBSPOT_PORTAL_ID=1234567
   ```
5. Start development server:
   ```bash
   npm run dev
   ```
6. Open [http://localhost:3000](http://localhost:3000) to view the calendar.

## Deployment
Deploy to Vercel or any platform that supports Next.js. Make sure to set the `HUBSPOT_TOKEN` and `HUBSPOT_PORTAL_ID` environment variables.

## HubSpot Integration
1. Create an app in the HubSpot developers dashboard.
2. Add a UI extension (app card or full page) and set the URL to your deployed site.
3. Grant necessary scopes: `crm.objects.meetings.read`, `crm.objects.calls.read`, `crm.objects.tasks.read`.

## License
MIT
