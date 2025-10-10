# Nivaana E-Commerce Web App

A modern, responsive e-commerce web application built with React, TypeScript, Vite, and TailwindCSS.

## Features

- **Responsive Design**: Mobile-first approach with seamless experience across all devices
- **Modern UI**: Clean, professional design with custom color palette
- **Product Catalog**: Browse products with filtering and sorting capabilities
- **Interactive Banner**: Auto-rotating hero banner with navigation controls
- **Navigation**: Sticky navbar with smooth transitions
- **Terms & Conditions**: Comprehensive legal page with proper typography

## Tech Stack

- **React 19** - Latest React with modern features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **TailwindCSS** - Utility-first CSS framework
- **React Router** - Client-side routing

## Color Palette

- **Primary Gold**: #ffd200 (buttons, logos, headings, accents)
- **Primary Blue**: #485470 (navbar, backgrounds, links)
- **Secondary Colors**: Black, White, Dark Gray, Medium Gray, Light Gray, Extra Light Gray

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Navbar.tsx      # Navigation component
│   ├── Banner.tsx      # Hero banner with carousel
│   ├── ProductCard.tsx # Product display card
│   └── Footer.tsx      # Site footer
├── pages/              # Page components
│   ├── Home.tsx        # Homepage with featured products
│   ├── Products.tsx    # Product listing with filters
│   └── TermsAndConditions.tsx # Legal terms page
├── data/               # Sample data
│   └── sampleData.ts   # Product and banner data
├── types/              # TypeScript type definitions
│   └── index.ts        # Interface definitions
└── App.tsx             # Main app component with routing
```

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Preview production build**:
   ```bash
   npm run preview
   ```

## Pages

- **Home** (`/`) - Hero banner, featured products, highlights, newsletter signup
- **Products** (`/products`) - Complete product catalog with filtering and sorting
- **Terms & Conditions** (`/terms`) - Legal information with proper formatting

## Components

- **Navbar**: Sticky navigation with active state indicators
- **Banner**: Auto-rotating carousel with manual controls
- **ProductCard**: Interactive product cards with hover effects
- **Footer**: Comprehensive footer with links and contact info

## Responsive Design

The application is built with a mobile-first approach and includes:
- Responsive grid layouts
- Mobile-optimized navigation
- Touch-friendly interactive elements
- Optimized typography for all screen sizes
