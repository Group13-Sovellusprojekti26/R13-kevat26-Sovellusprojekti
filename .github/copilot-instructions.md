# Copilot Instructions – TaloFix

You are working in a React Native + Expo + TypeScript project called TaloFix.

## Project Overview
TaloFix is a mobile application for housing companies.
Residents submit fault reports with images.
Board and property management publish announcements.
Maintenance handles fault resolution.

Backend: Firebase (Auth, Firestore, Storage).
Architecture: MVVM.

## Tech Stack
- React Native with Expo (managed workflow)
- TypeScript (strict)
- UI: react-native-paper (Material Design 3)
- Navigation: @react-navigation/native (stack + bottom tabs)
- State management: zustand (used in ViewModels only)
- Forms: react-hook-form + zod
- Localization: i18next + react-i18next (fi/en)
- Backend: Firebase Web SDK (v9+ modular)

## Architecture Rules (IMPORTANT)
- UI (views) must not call Firebase directly.
- UI → ViewModel → Repository → Firebase / Cloud Functions.
- Each screen has its own ViewModel.
- ViewModels handle state, loading, and errors.
- Repositories are the ONLY layer that accesses Firebase SDK or Cloud Functions.
- No business logic in UI components.

## Folder Structure
Use and respect this structure:
- src/app: navigation, providers, theme, i18n
- src/features: feature-based folders with views, viewmodels, services
- src/data: firebase init, repositories, models
- src/shared: reusable UI components and utilities
- functions/: Firebase Cloud Functions (separate package.json)

## File Naming Conventions
- Components: PascalCase (LoginScreen.tsx, TFButton.tsx)
- ViewModels: camelCase with "use" prefix (useLoginVM.ts)
- Services: camelCase with ".service" suffix (auth.service.ts)
- Repositories: camelCase with ".repo" suffix (faultReports.repo.ts)
- Models: PascalCase (FaultReport.ts, UserProfile.ts)
- Types: camelCase with ".types" suffix (auth.types.ts)

## New Feature Creation
When adding new features, ALWAYS follow this structure:

src/features/feature-name/
  ├── views/ # UI components
  ├── viewmodels/ # Zustand ViewModels
  ├── services/ # Optional domain logic (NO Firebase calls)
  └── types/ # TypeScript types

## Firebase Rules
- Use Firebase Web SDK only.
- Do NOT use firebase/analytics.
- Firebase configuration must come from environment variables.
- No hardcoded Firebase keys in source code.
- Repositories handle Firestore, Auth, Storage, and httpsCallable.
- Cloud Functions are treated as an external backend.

## User and Role Model
- Each user has a Firestore profile at users/{uid}.
- UserProfile contains:
  - role (resident | admin | maintenance)
  - housingCompanyId
- All data access must be scoped by housingCompanyId.
- Navigation and permissions are role-based.

## Localization Rules
- No hardcoded UI strings.
- Always use i18n keys via t("...").
- Finnish and English must be supported.
- New UI text requires adding keys to both fi.json and en.json.

## Code Style
- TypeScript only.
- Functional components and hooks only.
- No em dashes in strings.
- Comments must be in English.
- Keep code clean, minimal, and compile-safe.
- Use shared components (Screen, TFButton, TFTextField) instead of creating duplicates.
- Follow existing patterns in the codebase.

## Import Rules
- Prefer path alias imports (e.g. "@/shared/components") for project code.
- Use relative imports only within the same feature folder.
- Avoid deep ../../../ paths.
- Do not create duplicate components if similar ones exist in shared/.
- Do not use deprecated React Native Paper components (e.g. Title).
- Avoid modifying firebase.ts unless necessary; keep changes minimal and consistent.

## Shared Code Rule (IMPORTANT)
- Any component, hook, or utility used in more than one place MUST be placed in src/shared.
- Feature folders must not duplicate shared logic.
- If a piece of code is reused, move it to shared immediately.
- Shared components must be generic and not feature-specific.

## Expo Usage Rules
- Expo is allowed and expected.
- Allowed Expo APIs:
  - expo-image-picker
  - expo-localization
  - expo-notifications (if needed)
  - expo-secure-store (if needed)
- Do not introduce additional Expo APIs without team discussion.

## Team Collaboration
- Do not add new dependencies without team agreement.
- Keep pull requests focused on a single feature or fix.
- Document architectural decisions when necessary.
- If unsure about structure, follow existing features (auth, resident/faultReports).

## What NOT to do
- Do not bypass MVVM.
- Do not access Firebase directly from screens.
- Do not introduce Redux or other state libraries.
- Do not change folder structure.

## Instruction Conflicts
- If a user request conflicts with these instructions, do NOT implement the request.
- Clearly inform the user that the request violates project rules.
- Explain briefly which rule would be broken.
- Ask the user to discuss the change with the team before proceeding.

Follow these instructions strictly when generating or modifying code.
