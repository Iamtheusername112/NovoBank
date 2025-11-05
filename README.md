# NovaBank - Banking App

A modern banking application built with Next.js, Chakra UI, Tailwind CSS, and Supabase.

## Features

- 🔐 **Authentication** - PIN entry and fingerprint authentication
- 💳 **Cards Management** - View and manage multiple cards
- 💸 **Send Money** - Transfer money with swipe-to-pay functionality
- 📊 **Statistics** - View spending analytics with charts
- 👤 **Profile & Settings** - Manage personal settings and preferences
- 🎨 **Widgets** - Customizable dashboard widgets
- 📱 **Mobile-First Design** - Responsive design optimized for mobile devices

## Tech Stack

- **Framework**: Next.js 16
- **Language**: JavaScript (strict mode)
- **UI Library**: Chakra UI
- **Styling**: Tailwind CSS
- **Backend**: Supabase
- **Icons**: Lucide React
- **Notifications**: Sonner
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account (optional for development)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd novobank
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory (copy from `.env.example`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**For now (development without Supabase):**
You can use placeholder values if you haven't set up Supabase yet:
```env
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-key
```
The app UI will work, but authentication features will need real Supabase credentials later.

4. Set up the database:
   - Go to your Supabase Dashboard → SQL Editor
   - Copy and run the contents of `supabase/migrations/001_initial_schema.sql`
   - This creates all necessary tables with proper security policies

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
novobank/
├── app/
│   ├── auth/              # Authentication page (PIN/Fingerprint)
│   ├── cards/             # Cards management page
│   ├── send-money/        # Send money with swipe-to-pay
│   ├── profile/           # Profile and settings page
│   ├── statistics/        # Statistics and charts page
│   ├── widgets/           # Widgets management page
│   ├── favorites/         # Favorites page
│   ├── notifications/     # Notifications page
│   ├── layout.js          # Root layout
│   ├── page.js            # Home/Wallet page
│   ├── providers.js       # Chakra UI provider
│   └── theme.js           # Chakra UI theme configuration
├── components/
│   ├── BottomNavigation.js   # Bottom navigation bar
│   └── StatusBar.js          # Mobile status bar
├── lib/
│   └── supabase.js           # Supabase client configuration
└── public/                    # Static assets
```

## Available Routes

- `/` - Home/Wallet page (Cards overview)
- `/auth` - Authentication page
- `/cards` - Cards management
- `/send-money` - Send money page
- `/profile` - Profile and settings
- `/statistics` - Statistics and analytics
- `/widgets` - Widgets management
- `/favorites` - Favorites page
- `/notifications` - Notifications page

## Features Overview

### Authentication
- PIN entry with 4-digit code
- Fingerprint authentication (placeholder)
- Secure login flow

### Cards
- View multiple cards with gradient designs
- Card balance display
- Recent transactions
- Quick send again feature

### Send Money
- Numeric keypad for amount entry
- Recipient selection
- Swipe-to-pay functionality
- Real-time amount display

### Statistics
- Spending overview with donut charts
- Time period selection (week/month/year)
- Transaction history
- Spending comparison

### Profile & Settings
- Personal information
- Appearance settings (dark mode)
- Security settings
- Notification preferences
- Card management options

## Development

### Building for Production

```bash
npm run build
npm start
```

### Code Style

This project uses:
- JavaScript (strict mode)
- ES6+ features
- React hooks
- Functional components

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
# NovoBank
