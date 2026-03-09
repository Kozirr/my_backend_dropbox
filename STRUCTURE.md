# Project Structure

> This document is a living reference, updated after each implementation phase.

## Root

```
my_backend_dropbox/
├── amplify/                    # AWS Amplify Gen 2 backend (IaC)
│   ├── auth/                   # Cognito authentication config
│   │   └── resource.ts          # Email/password auth definition
│   ├── data/                   # DynamoDB data model config
│   │   └── resource.ts          # FileRecord model (fileName, s3Key, fileSize, contentType, version, owner)
│   ├── storage/                # S3 storage config
│   │   └── resource.ts          # Private per-user file storage (private/{entity_id}/*)
│   ├── functions/              # Lambda function definitions
│   │   ├── onDeleteRecord/     # Lambda: clean up S3 on DynamoDB record delete
│   │   │   ├── handler.py       # Python handler — deletes S3 object on REMOVE stream event
│   │   │   └── resource.ts      # CDK Function definition (Python 3.12)
│   │   └── onRenameFile/       # Lambda: replicate S3 object on file rename
│   │       ├── handler.py       # Python handler — copies/deletes S3 on MODIFY (fileName change)
│   │       └── resource.ts      # CDK Function definition (Python 3.12)
│   └── backend.ts              # Main backend entry — wires auth, data, storage, Lambdas, DynamoDB streams
├── src/                        # React frontend source
│   ├── components/             # React components (1 per file + paired CSS)
│   │   ├── AuthWrapper.tsx     # Wraps app with Amplify <Authenticator>
│   │   ├── AuthWrapper.css     # Auth wrapper styles
│   │   ├── Header.tsx          # App header with branding + sign-out
│   │   ├── Header.css          # Header styles
│   │   ├── FileUpload.tsx      # Drag-and-drop upload zone, S3 upload + DynamoDB record
│   │   ├── FileUpload.css      # Upload zone styles + progress bar
│   │   ├── FileList.tsx        # Lists user’s files, coordinates delete/rename/versions
│   │   ├── FileList.css        # File list layout styles
│   │   ├── FileItem.tsx        # Single file row — info + Download/Rename/Delete/Versions buttons
│   │   ├── FileItem.css        # File item card styles
│   │   ├── FileVersions.tsx    # Modal showing all versions of a file with download links
│   │   ├── FileVersions.css    # Version list + modal styles
│   │   ├── RenameModal.tsx     # Modal to rename a file (triggers Lambda 2 via DynamoDB update)
│   │   └── RenameModal.css     # Rename modal form styles
│   ├── assets/                 # Static assets (images, SVGs)
│   ├── App.tsx                 # Main app component (AuthWrapper + Header + content)
│   ├── App.css                 # App-level styles (dark theme)
│   ├── main.tsx                # Vite entry point + Amplify.configure()
│   └── index.css               # Global styles (dark theme base)
├── public/                     # Public static files
├── index.html                  # HTML entry point
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript config (root)
├── tsconfig.app.json           # TypeScript config (app)
├── tsconfig.node.json          # TypeScript config (node/build)
├── vite.config.ts              # Vite build config
├── eslint.config.js            # ESLint config
├── .gitignore                  # Git ignore rules
├── README.md                   # Project overview and setup instructions
└── STRUCTURE.md                # This file — project structure reference
```

## Status

- [x] Phase 1: Project Scaffolding — Vite + React + TypeScript initialized, Amplify dirs created, README, .gitignore, STRUCTURE.md
- [x] Phase 2: Authentication (Cognito) — auth/resource.ts, AuthWrapper, Header, App wiring, Amplify.configure()
- [x] Phase 3: Data Model (DynamoDB) — FileRecord schema with owner-based auth rules
- [x] Phase 4: Storage (S3) — private per-user paths with read/write/delete for authenticated users
- [x] Phase 5: Lambda Functions (Python 3.12) — CDK Functions with DynamoDB stream triggers, S3/DynamoDB permissions
- [x] Phase 6: Frontend Components — FileUpload, FileList, FileItem, FileVersions, RenameModal with full functionality
- [x] Phase 7: DNS & Hosting — ready for `npx ampx sandbox` / Amplify Console deploy. URL placeholder in README.
