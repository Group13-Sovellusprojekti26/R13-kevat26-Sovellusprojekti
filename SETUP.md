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
│   │   ├── navigation/    # Navigation setup
│   │   ├── providers/     # React Context providers
│   │   ├── theme/         # Material Design 3 theme
│   │   └── i18n/          # Internationalization (FI/EN)
│   ├── data/              # Data layer
│   │   ├── firebase/      # Firebase config
│   │   ├── repositories/  # Data access
│   │   └── models/        # TypeScript models
│   ├── features/          # Feature modules (MVVM)
│   │   ├── auth/          # Authentication
│   │   └── resident/      # Resident features
│   └── shared/            # Shared components & utils
├── App.tsx               # Root component
└── package.json          # Dependencies
```

## MVVM Architecture

Each feature follows this structure:

```
feature/
├── views/         # React components (UI)
├── viewmodels/    # Business logic (Zustand stores)
├── services/      # External API calls
└── types/         # TypeScript types
```

## Key Technologies

- **UI**: react-native-paper (Material Design 3)
- **Forms**: react-hook-form + zod validation
- **State**: zustand
- **Navigation**: React Navigation
- **Backend**: Firebase (modular SDK v9+)
- **i18n**: i18next

## Features Implemented

✅ Authentication (Login with email/password)
✅ Fault Report List (MVVM pattern)
✅ Create Fault Report (with form validation)
✅ Material Design 3 theming
✅ Finnish/English localization
✅ Bottom tab navigation
✅ Firebase integration (ready to configure)

## Next Steps

1. Configure your Firebase credentials
2. Test the authentication flow
3. Add more features as needed
4. Customize the theme colors
5. Add unit tests

## Troubleshooting

**TypeScript Errors**: 
- Run `npx expo start -c` to clear cache
- Delete `node_modules` and run `npm install`

**Firebase Errors**: 
- Verify `.env` file has correct credentials
- Check Firebase console for enabled services

**Navigation Errors**: 
- Ensure all navigation dependencies are installed
- Clear Metro bundler cache

## Development Tips

- Use `t('key')` for all UI strings (localization)
- Keep ViewModels separate from Views
- Use repositories for all Firebase calls
- Follow TypeScript strict mode
- Comment code in English only

## Support

For issues, check:
1. Firebase Console (auth, firestore, storage)
2. Expo documentation
3. React Native Paper documentation
4. PROJECT_STRUCTURE.md for detailed info
