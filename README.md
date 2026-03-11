# Dropbox Clone

Dropbox Clone is a Dropbox-inspired file manager built with React and AWS Amplify Gen 2. It provides authenticated personal storage, versioned uploads, folder navigation, profile editing, file preview, secure public share links with expiration, and a cloud-hosted web interface.

## Hosted Application

The project is hosted in the cloud at:

https://www.meow.theyka.net/

This URL is the submission URL and should remain available during correction.

## Project Overview

The application combines a React frontend with Amplify-managed AWS services:

- Amazon Cognito for user authentication
- Amazon S3 for private file storage
- Amazon DynamoDB for file, folder, profile, and share-link metadata
- AWS Lambda for background workflows and public share resolution
- AWS Amplify Hosting for the deployed frontend
- Amazon Route 53 for the custom domain configuration

## Features

- Email-based sign up and sign in
- File upload with version history
- Folder creation and navigation
- File rename and deletion
- File preview for images, text files, and PDFs
- Profile page with editable persisted user information
- Secure share links with expiration dates
- Public share route for opening shared files
- Responsive Dropbox-style interface

## Repository Rules

- React components live in `src/components/`
- Each component has its own file
- Component CSS is stored in the matching `ComponentName.css` file when styling is needed
- `node_modules/` and build artifacts are ignored by `.gitignore`

## Local Development

### Prerequisites

- Node.js 20+
- npm
- AWS account with Amplify access

### Install dependencies

```bash
npm install
```

### Start a local Amplify sandbox

```bash
npx ampx sandbox
```

### Run the frontend

```bash
npm run dev
```

## Validation

The project has been validated locally with:

```bash
npm run lint
npm run build
npx tsc -p tsconfig.amplify.json
```

## Deployment

Deploy the application with Amplify Hosting:

```bash
npx ampx pipeline-deploy --branch main
```

After deployment, refresh `amplify_outputs.json` so the frontend receives the latest backend outputs, including the public share resolver URL.
