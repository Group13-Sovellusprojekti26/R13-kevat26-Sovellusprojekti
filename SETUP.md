# TaloFix - Setup Instructions

## Quick Start

1. **Install Dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Configure Firebase**:
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Email/Password authentication
   - Create a Firestore database (start in test mode)
   - Enable Storage
   - Copy `.env.example` to `.env` and add your Firebase credentials

3. **Start the Development Server**:
   ```bash
   npx expo start -c
   ```

4. **Run on Device/Emulator**:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on physical device

## Project Structure Overview

```
TaloFix/
├── src/
│   ├── app/               # App-level configuration
│   │   ├── navigation/    # Navigation setup (all roles)
│   │   ├── providers/     # React Context providers
│   │   ├── theme/         # Material Design 3 theme
│   │   └── i18n/          # Internationalization (FI/EN)
│   ├── data/              # Data layer
│   │   ├── firebase/      # Firebase config
│   │   ├── repositories/  # Data access (Firestore + Cloud Functions)
│   │   └── models/        # TypeScript models
│   ├── features/          # Feature modules (MVVM)
│   │   ├── auth/          # Authentication
│   │   ├── admin/         # Admin features
│   │   ├── housingCompany/   # Housing company features
│   │   ├── maintenance/      # Property manager features
│   │   ├── serviceCompany/   # Service company features
│   │   ├── resident/         # Resident features
│   │   └── settings/         # Settings for all roles
│   └── shared/            # Shared components & utils
├── functions/            # Firebase Cloud Functions
├── App.tsx               # Root component
└── package.json          # Dependencies
```

## MVVM Architecture

Each feature follows this structure:

```
feature/
├── views/         # React components (UI)
├── viewmodels/    # Business logic (Zustand stores)
└── types/         # TypeScript types
```

Data access is centralized in `data/repositories/`.

## Key Technologies

- **UI**: react-native-paper (Material Design 3)
- **Forms**: react-hook-form + zod validation
- **State**: zustand
- **Navigation**: React Navigation (Stack + Bottom Tabs)
- **Backend**: Firebase (Auth, Firestore, Storage, Cloud Functions)
- **i18n**: i18next + react-i18next
- **Images**: expo-image-picker + expo-image-manipulator
- **Charts**: react-native-gifted-charts

## Features Implemented

✅ Authentication (Login, Register with invite codes)
✅ Role-based navigation (Admin, Housing Company, Maintenance, Service Company, Resident)
✅ Fault Report management (Create, List, Update, Assign)
✅ Announcements (Create, List, Publish)
✅ Housing Company management (Create, Invite residents/partners)
✅ Invite code system (8-character codes for secure registration)
✅ Image upload (Fault reports, Announcements)
✅ Material Design 3 theming
✅ Finnish/English localization
✅ Firebase Security Rules + Cloud Functions hybrid
✅ Statistics and charts

## Next Steps

1. Configure your Firebase credentials
2. Deploy Firestore security rules and Cloud Functions
3. Test the authentication flow with different roles
4. Create a housing company (admin role required)
5. Generate invite codes and test registration
6. Customize the theme colors
7. Add unit tests

## Troubleshooting

**TypeScript Errors**: 
- Run `npx expo start -c` to clear cache
- Delete `node_modules` and run `npm install`

**Firebase Errors**: 
- Verify `.env` file has correct credentials
- Check Firebase console for enabled services (Auth, Firestore, Storage, Functions)
- Ensure Security Rules are deployed: `firebase deploy --only firestore:rules`
- Ensure Cloud Functions are deployed: `cd functions && npm run deploy`

**Navigation Errors**: 
- Ensure all navigation dependencies are installed
- Clear Metro bundler cache

## Development Tips

- Use `t('key')` for all UI strings (localization)
- Keep ViewModels separate from Views
- Use repositories for all Firebase calls (never call Firebase directly from UI or ViewModels)
- Follow TypeScript strict mode
- Comment code in English only
- Security Rules + Cloud Functions hybrid: simple operations use direct Firestore, privileged operations use Functions

## Support

For issues, check:
1. Firebase Console (auth, firestore, storage)
2. Expo documentation
3. React Native Paper documentation
4. PROJECT_STRUCTURE.md for detailed info
