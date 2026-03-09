# Serverless Dropbox Clone

A serverless file management app built on AWS. Authenticated users can upload files, view version history, rename files, delete files, and download stored versions through a hosted web interface.

## Deployed URL

https://www.meow.theyka.net/

## What Users Can Do

- Sign up and sign in with email-based authentication
- Upload files to private user storage
- View current files and past versions
- Rename files while keeping the full version history grouped together
- Delete files and their stored objects
- Download the current file or any saved version directly from the app

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite |
| Backend IaC | AWS Amplify Gen 2 |
| Authentication | Amazon Cognito |
| File storage | Amazon S3 |
| Metadata | Amazon DynamoDB |
| Background processing | AWS Lambda |
| Hosting | AWS Amplify Hosting |
| DNS | Amazon Route 53 |

## Architecture

- The frontend is hosted with AWS Amplify Hosting.
- Authentication is handled by Amazon Cognito.
- File binaries are stored in Amazon S3.
- File metadata and version information are stored in Amazon DynamoDB.
- Lambda functions react to DynamoDB stream events for file-delete and file-rename workflows.
- Renaming updates every version record for the file, and the rename Lambda keeps the S3 object keys aligned with the new filename.
- The public domain `www.meow.theyka.net` is configured in Amazon Route 53.

Route 53 is part of the deployed architecture, but the DNS records are configured outside this repository. This repository does not provision Route 53 resources directly.

## Local Development

### Prerequisites

- Node.js 18+
- npm
- AWS account with Amplify access

### Run Locally

```bash
npm install
npx ampx sandbox
npm run dev
```

## Deployment

```bash
npx ampx pipeline-deploy --branch main
```
