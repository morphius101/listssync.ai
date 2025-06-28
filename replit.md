# ListsSync.ai - Real-time Checklist Platform

## Overview

ListsSync.ai is a modern web application that enables real-time checklist collaboration with photo verification. The platform allows users to create checklists, share them with others, and track completion progress with photo proof. The system is designed for service businesses, property managers, cleaning services, and any team that needs to coordinate task completion remotely.

## System Architecture

The application follows a full-stack architecture with the following components:

- **Frontend**: React with TypeScript, using Vite for build tooling
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Real-time Communication**: WebSocket implementation for live updates
- **Authentication**: Firebase Auth with Google sign-in
- **File Storage**: Firebase Storage for photo uploads
- **Email Service**: SendGrid for email notifications
- **SMS Service**: Twilio for SMS verification
- **UI Framework**: Tailwind CSS with shadcn/ui components

## Key Components

### Database Layer
- **Drizzle ORM**: Type-safe database operations with PostgreSQL
- **Schema**: Defined in `shared/schema.ts` with user management, checklists, tasks, and verification tables
- **Tiered Subscription System**: Supports Free, Professional, and Enterprise tiers with usage limits

### Authentication & Authorization
- **Firebase Authentication**: Google OAuth integration for user sign-in
- **Verification System**: Token-based verification for checklist access without requiring user accounts
- **Subscription Management**: Tier-based access control with usage tracking

### Real-time Features
- **WebSocket Server**: Live updates for checklist progress and task completion
- **Offline Support**: Service worker implementation for offline functionality
- **Progressive Web App**: PWA capabilities with manifest and service worker

### Translation Services
- **OpenAI Integration**: Automatic translation of checklists into multiple languages
- **Language Support**: 10 languages including English, Spanish, French, German, Portuguese, Chinese, Russian, Japanese, Arabic, and Hindi
- **Tier-based Language Access**: Free tier limited to English/Spanish, higher tiers unlock more languages

### Notification Services
- **Email Notifications**: SendGrid integration for checklist sharing and updates
- **SMS Verification**: Twilio integration for phone verification
- **Masked Contact Display**: Privacy protection for shared contact information

## Data Flow

1. **User Authentication**: Users sign in via Google OAuth through Firebase
2. **Checklist Creation**: Authenticated users create checklists with configurable tasks
3. **Sharing Mechanism**: Checklists can be shared via email/SMS with verification tokens
4. **Real-time Updates**: WebSocket connections provide live progress updates
5. **Photo Verification**: Tasks can require photo proof, uploaded to Firebase Storage
6. **Translation Pipeline**: Checklists can be translated using OpenAI API based on user's subscription tier

## External Dependencies

### Third-party Services
- **Firebase**: Authentication, Firestore, and Storage
- **Neon Database**: PostgreSQL hosting for production
- **SendGrid**: Email delivery service
- **Twilio**: SMS messaging service
- **OpenAI**: Language translation services
- **Stripe**: Payment processing for subscriptions

### Key NPM Packages
- **React 18**: Frontend framework with hooks and modern patterns
- **Express**: Backend web server
- **Drizzle**: Type-safe ORM for database operations
- **shadcn/ui**: Pre-built UI component library
- **Tailwind CSS**: Utility-first CSS framework
- **React Query**: Server state management and caching
- **Wouter**: Lightweight routing for React

## Deployment Strategy

### Production Environment
- **Custom Domain**: www.listssync.ai with SSL certificate
- **Environment Variables**: Secure configuration for API keys and database connections
- **Build Process**: Vite for frontend bundling, esbuild for backend compilation
- **Static File Serving**: Express serves built frontend assets in production

### Development Environment
- **Hot Module Replacement**: Vite development server with instant updates
- **TypeScript**: Full type safety across frontend, backend, and shared schemas
- **Path Aliases**: Configured for clean imports (@/, @shared/, @assets/)

### Database Management
- **Migrations**: Drizzle Kit for database schema management
- **Connection Pooling**: Neon serverless connection handling
- **Type Safety**: Generated types from database schema

## Changelog

```
Changelog:
- June 28, 2025. Initial setup
- June 28, 2025. Added SMS consent functionality for Twilio compliance
  - Created SMS consent database table and storage methods
  - Built SMS consent page with opt-in banners and compliance messaging
  - Added API endpoints for recording, retrieving, and revoking SMS consent
  - Integrated opt-in banners for both SMS and email consent areas
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```