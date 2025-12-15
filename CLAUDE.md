# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a customer management system (members.invento.jp) for internal company use. It provides customer management, service registration, service logs with camera capture, and inquiry management features with dual interfaces for administrators and customers.

**Tech Stack:**
- Next.js 15 (App Router) with TypeScript
- Tailwind CSS 4
- Firebase (Authentication, Firestore, Storage, Hosting)
- React 19

## Development Commands

```bash
# Development
npm run dev                    # Start dev server with Turbopack

# Build
npm run build                  # Production build for Firebase Functions
npm run build:static           # Static export build (set BUILD_STATIC=true)

# Linting
npm run lint                   # Run ESLint

# Deployment
npm run deploy                 # Full deployment (build + functions + Firebase)
npm run deploy:hosting         # Deploy hosting only
npm run deploy:functions       # Deploy functions only (includes functions build)
```

## Architecture

### Dual-Interface System

The application has two distinct user interfaces:
1. **Admin Interface** (`/admin/*`): Full CRUD operations for customers, services, service categories, service logs, billing, and inquiries
2. **Customer Portal** (`/dashboard/*`): Read-only access to their own services, service logs, and inquiry submission

Access control is enforced at multiple levels:
- `app/admin/layout.tsx`: Client-side route protection checking `user.role === 'admin'`
- `contexts/AuthContext.tsx`: Central authentication state with role management
- Firestore Security Rules: Database-level access control

### Firebase Integration

**Client-side Firebase** (`lib/firebase/config.ts`):
- Initialized on client with NEXT_PUBLIC_* environment variables
- Used for authentication, Firestore queries, and Storage operations
- Auth language set to Japanese (`auth.languageCode = 'ja'`)

**Server-side Firebase Admin** (`lib/firebase/admin.ts`):
- **DEPRECATED**: This file exports dummy objects for backward compatibility
- For API routes, use dynamic imports of `firebase-admin` to avoid build-time initialization errors
- Example pattern from existing API routes:
  ```typescript
  const admin = await import('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      }),
    });
  }
  ```

### Data Layer Organization

All Firebase operations are centralized in `lib/firebase/`:
- `customers.ts`: Customer CRUD operations
- `services.ts`: Service management with category relationships
- `serviceCategories.ts`: Service category operations
- `serviceLogs.ts`: Service log management with image handling
- `inquiries.ts`: Inquiry form operations
- `activities.ts`: Activity logging

### Service Architecture

**Hierarchical Structure:**
- Service Categories (top level) → Services → Customer assignments
- Services can have `logEnabled: boolean` flag for service log functionality
- Customers can contract multiple services via array field in customer document

**Service Logs:**
- Only available for services with `logEnabled: true`
- Supports WebRTC camera capture and file upload (max 5 images)
- Admins create/edit logs; customers view their own logs only
- Images stored in Firebase Storage

### Type System

All types defined in `types/`:
- `customer.ts`: Customer data structure with service assignments
- `service.ts`: Service and service category types
- `serviceLog.ts`: Service log with image URLs
- `inquiry.ts`: Contact form data
- `auth.ts`: User and auth context types
- `core-js.d.ts`: Legacy browser polyfill type definitions

### Environment Variables

Create `.env.local` from `.env.local.example`:
- `NEXT_PUBLIC_FIREBASE_*`: Client-side Firebase config
- `FIREBASE_ADMIN_PRIVATE_KEY`: Server-side admin SDK (use dynamic import in API routes)
- `FIREBASE_ADMIN_CLIENT_EMAIL`: Admin service account email

## Build Considerations

- **DO NOT** use `firebase-admin` at build time (causes errors)
- Always use dynamic imports for admin SDK in API routes
- Images unoptimized (`images.unoptimized: true`)

### Known Patterns

When creating new API routes that need Firebase Admin:
1. Use dynamic import pattern (see existing routes in `app/api/`)
2. Never import from `lib/firebase/admin.ts`
3. Check if app is already initialized before calling `initializeApp()`

## Deployment Architecture

**Hosting:** Firebase Hosting with Next.js SSR via Firebase Functions
- `firebase.json` rewrites all routes to `nextjsFunc` function
- `functions/` directory contains the deployed Next.js app (not present in dev)
- Deploy script builds Next.js, then functions, then deploys both

**Output:** `standalone` mode for Vercel-style deployment optimization

## Key Implementation Notes

1. **No Functions Directory in Development**: The `functions/` folder is created during deployment process. Don't expect it during local dev.

2. **Role-Based Access**: Users have `role: 'admin' | 'user'` in Firestore `users` collection. Auth context loads this from Firestore on login.

3. **Customer ID Linking**: Users can have optional `customerId` field linking their auth account to a customer record.

4. **Japanese UI**: All UI text is in Japanese. Firebase Auth is configured for Japanese language.

5. **Service Log Images**: Stored in Firebase Storage. Service logs support max 5 images with preview functionality.

6. **Email Functionality**:
   - Uses Resend SDK (dynamically imported to avoid build errors)
   - Auto-reply email on inquiry submission via `app/api/send-inquiry-email/route.ts`

7. **Security**: Firestore security rules in `firestore.rules` enforce access control. Always test rule changes carefully.

## Common Development Patterns

### Adding New API Routes

```typescript
export async function POST(request: Request) {
  const admin = await import('firebase-admin');
  // Initialize only if not already initialized
  if (!admin.apps.length) {
    admin.initializeApp({ /* config */ });
  }
  // Your logic here
}
```

### Creating New Admin Pages

1. Place in `app/admin/*/page.tsx`
2. Protected automatically by `app/admin/layout.tsx`
3. Add navigation link to `app/admin/layout.tsx` navigation array

### Creating New Customer Portal Pages

1. Place in `app/dashboard/*/page.tsx`
2. Create corresponding data fetch in `lib/firebase/`
3. Filter data by `user.customerId` to show only relevant records

## Testing Deployment

Before deploying:
1. Run `npm run build` to ensure production build succeeds
2. Test legacy browser compatibility if making significant JS changes
3. Verify Firestore rules if modifying data access patterns
