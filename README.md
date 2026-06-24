# Beauty Marketing — React Native (Expo)
## Salon Cameroun · Odoo 17 · Firebase FCM · TypeScript

## Pré-requis
- Node.js 18+
- npm install -g expo-cli
- Compte Firebase (gratuit)
- Module beauty_marketing installé sur Odoo 17

## Installation
```bash
cd beauty-marketing-app
npm install
npx expo start
```

## Étapes obligatoires
1. Ajouter google-services.json (Firebase Console → Android)
2. Éditer src/constants/index.ts (URL Odoo, DB, login, password)
3. Coller la Clé FCM dans Odoo > Paramètres > Beauty Salon Marketing
4. npx expo start --android

## Build APK production
```bash
npx eas build --platform android
```