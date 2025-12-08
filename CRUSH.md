# Development Commands
npm run dev              # Start development server with Turbopack
npm run dev:legacy       # Start development server without Turbopack
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run lint:fix         # Fix linting issues automatically
npm run type-check       # Run TypeScript type checking
npm run analyze          # Analyze bundle size

# Code Style Guidelines
- Use TypeScript with strict mode enabled
- Import order: React/Next.js → third-party → internal types → internal components/lib
- Use absolute imports with @/ alias for all internal imports
- Component files: PascalCase (VideoCard.tsx)
- Hook files: camelCase with use- prefix (use-subscription-feed.tsx)
- Utility files: camelCase (youtube.ts, utils.ts)
- Use "use client" directive for client components
- Prefer function components over class components
- Use shadcn/ui components from @/components/ui
- Handle errors with try-catch and throw descriptive errors
- Use async/await for async operations
- Environment variables validated in src/lib/env-validation.ts