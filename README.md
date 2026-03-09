# Serverless Dropbox Clone

A Dropbox-like file synchronization service built as a fully serverless application on AWS.

## Overview

Users can sign up, upload files, download files, manage file versions, rename and delete files — all backed by a serverless AWS infrastructure that scales automatically and costs nothing on the free tier.

## Architecture

- **Frontend**: React + TypeScript (Vite), hosted via AWS Amplify Hosting
- **Authentication**: Amazon Cognito (email/password sign-up/sign-in with email verification)
- **File Storage**: Amazon S3 (private per-user paths)
- **Database**: Amazon DynamoDB (file metadata, version tracking)
- **Serverless Functions**: AWS Lambda (Python 3.12)
  - `onDeleteRecord` — triggered by DynamoDB Stream on record deletion, cleans up the corresponding S3 object
  - `onRenameFile` — triggered by DynamoDB Stream on file name change, replicates the S3 object with the new name and deletes the old one
- **DNS/Routing**: Amazon Route 53 + Amplify Hosting

## Features

- **User Authentication** — secure sign-up/sign-in with email verification via Cognito
- **File Upload** — drag-and-drop or file picker, uploaded to S3 with metadata stored in DynamoDB
- **File Versioning** — uploading a file with the same name creates a new version; view and download any previous version
- **File Rename** — renaming a file triggers a Lambda that replicates the S3 object under the new key
- **File Delete** — deleting a file triggers a Lambda that removes the S3 object
- **Per-User Isolation** — each user can only see and manage their own files

## Tech Stack

| Layer       | Technology                  |
|-------------|-----------------------------|
| Frontend    | React 19, TypeScript, Vite  |
| Auth        | Amazon Cognito              |
| Storage     | Amazon S3                   |
| Database    | Amazon DynamoDB             |
| Functions   | AWS Lambda (Python 3.12)    |
| Backend IaC | AWS Amplify Gen 2 (CDK)     |
| Hosting     | AWS Amplify Hosting         |
| DNS         | Amazon Route 53             |

## Hosted URL

> **TODO**: Add deployed URL here after hosting is configured.

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- AWS account with Amplify configured
- AWS CLI configured with appropriate credentials

### Local Development

```bash
# Install dependencies
npm install

# Start Amplify sandbox (deploys backend to AWS)
npx ampx sandbox

# In another terminal, start the frontend dev server
npm run dev
```

### Deployment

```bash
# Deploy to production
npx ampx pipeline-deploy --branch main
```

## Project Structure

See [STRUCTURE.md](STRUCTURE.md) for a detailed breakdown of the project structure.
