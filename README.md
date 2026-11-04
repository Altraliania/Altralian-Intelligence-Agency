# AIA — Altralian Intelligence Agency

A fictional agency database for the United Territories of the Altralian Republic (UTAR).

## Local development

1. Install Node.js.
2. In the project folder, run `npm install`.
3. Run `npm start`.
4. Open `http://localhost:3000`.

The server creates `private/people.json` automatically for local development.

## Online deployment

This project is configured for Render using `render.yaml`.

1. Create a Render account and connect your GitHub account.
2. In Render, create a new Blueprint and select this repository.
3. Review the service and disk costs before creating it. The current configuration uses a paid web-service plan and a 1 GB persistent disk.
4. In the service environment settings, set `AIA_ACCESS_PASSWORD` to a strong, unique password. Do not put this password in GitHub.
5. Deploy the service. Render will provide an HTTPS `onrender.com` address.

The website uses HTTP Basic Authentication. Your browser will ask for a username and password. The username is `AIA` unless you change `AIA_ACCESS_USERNAME`.

## Data and privacy

- Online records are stored under `/var/data/people.json` on the persistent disk.
- The disk preserves records across deploys and restarts.
- Local records are stored in `private/people.json`.
- Personnel records and passwords must never be committed to GitHub. The local JSON file is ignored by Git.
- This is a fictional project. Do not enter real people's private, sensitive, or identifying information.
- Anyone who has the AIA login can view and edit the fictional records. Only share the password with people you trust.

## Health check

Render checks `/healthz` to confirm that the server is running.
