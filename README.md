# ClimateReady SOS Live Tracker Map

A web application for real-time emergency location tracking, part of the ClimateReady mobile app ecosystem. This web app allows emergency contacts to view the real-time location of users who have activated the SOS feature in the ClimateReady mobile app.

## Overview

This web application serves as the companion to the ClimateReady mobile app's SOS feature. When a user activates an SOS alert from the mobile app, this web interface allows their emergency contacts to:

- Track their real-time location on a map
- See important medical information if shared by the user
- Receive updates on the emergency situation
- Access the information without needing to create an account

## Features

- **Real-time Location Tracking**: View live location updates of a person in distress
- **No Login Required for Emergency Access**: Emergency contacts can access the tracking map via a secure link
- **Medical Information Display**: Shows critical medical information if configured by the user
- **Responsive Design**: Works on desktop and mobile devices
- **Secure Access**: Uses secure tokens to ensure only authorized contacts can view the information

## Technologies Used

- React (with TypeScript)
- Firebase Authentication
- Firestore Database
- Google Maps API
- Vite build tool

## Local Development Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase account
- Google Maps API key

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/R-Tharanka/sos-live-tracker-map.git
   cd sos-live-tracker-map
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Configure your `.env` file with your Firebase and Google Maps API credentials:
   ```
   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id

   # Google Maps API Key
   VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
   
   # App Configuration
   VITE_APP_URL=http://localhost:3000
   VITE_APP_NAME=ClimateReady SOS Tracker
   ```

5. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## Deployment

### Deployment on Vercel (Recommended)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Navigate to the project directory and deploy:
   ```bash
   vercel
   ```

3. Follow the prompts to link your project and configure deployment settings.

4. A `vercel.json` configuration file is already included in the project to handle SPA routing.
   This ensures routes like `/login` and `/session/:id` work correctly.

5. Set environment variables in the Vercel project dashboard:
   - Add all the variables from your `.env` file
   - Update `VITE_APP_URL` to your deployed URL

5. Update the main ClimateReady app's environment variables:
   - Set `SOS_WEB_APP_URL` to your deployed URL

### Deployment Troubleshooting

If you encounter 404 errors when navigating directly to routes like `/login` or `/session/:id`:

1. Ensure the `vercel.json` file is in the root directory with the following content:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```

2. Check that all image references in your components use imports rather than direct paths
   ```tsx
   // Do this:
   import logoImg from '/logo.png';
   <img src={logoImg} alt="Logo" />
   
   // Instead of this:
   <img src="/logo.png" alt="Logo" />
   ```

3. Make sure your environment variables are correctly set in the Vercel dashboard

### Alternative Deployment Options

This web app can also be deployed to:
- Firebase Hosting
- Netlify
- GitHub Pages (with some additional configuration)

## Integration with ClimateReady Mobile App

This web application works in tandem with the ClimateReady mobile app. When a user activates the SOS feature in the mobile app, the following happens:

1. The mobile app creates an SOS session in Firebase
2. A secure token and session ID are generated
3. A tracking link is created with the format: `https://your-deployed-url/session/{sessionId}?token={token}`
4. This link is sent to emergency contacts via SMS
5. Emergency contacts can click the link to view the user's location in real-time

## Project Structure

- `/src/components/` - React components
  - `Login.tsx` - Authentication component
  - `MapTracker.tsx` - Main map tracking component
  - `SessionAccess.tsx` - Handles session token verification
- `/src/auth/` - Authentication logic
- `/src/types/` - TypeScript type definitions
- `vercel.json` - Configuration for Vercel deployment with SPA routing support

## Related Repositories

- [ClimateReady Mobile App](https://github.com/NIKKAvRULZ/ClimateReady)
  - The main mobile application that integrates with this web tracker

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -m 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.