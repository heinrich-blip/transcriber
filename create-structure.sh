#!/bin/bash

# Create main directories
mkdir -p public
mkdir -p src/components/ui
mkdir -p src/hooks
mkdir -p src/integrations/supabase
mkdir -p src/lib
mkdir -p src/pages
mkdir -p src/test
mkdir -p src/types
mkdir -p supabase/functions/process-audio

# Create public directory files
touch public/favicon.ico
touch public/placeholder.svg
touch public/robots.txt

# Create UI components
cd src/components/ui
touch accordion.tsx
touch alert-dialog.tsx
touch alert.tsx
touch aspect-ratio.tsx
touch avatar.tsx
touch badge.tsx
touch breadcrumb.tsx
touch button.tsx
touch calendar.tsx
touch card.tsx
touch carousel.tsx
touch chart.tsx
touch checkbox.tsx
touch collapsible.tsx
touch command.tsx
touch context-menu.tsx
touch dialog.tsx
touch drawer.tsx
touch dropdown-menu.tsx
touch form.tsx
touch hover-card.tsx
touch input-otp.tsx
touch input.tsx
touch label.tsx
touch menubar.tsx
touch navigation-menu.tsx
touch pagination.tsx
touch popover.tsx
touch progress.tsx
touch radio-group.tsx
touch resizable.tsx
touch scroll-area.tsx
touch select.tsx
touch separator.tsx
touch sheet.tsx
touch sidebar.tsx
touch skeleton.tsx
touch slider.tsx
touch sonner.tsx
touch switch.tsx
touch table.tsx
touch tabs.tsx
touch textarea.tsx
touch toast.tsx
touch toaster.tsx
touch toggle-group.tsx
touch toggle.tsx
touch tooltip.tsx
touch use-toast.ts
cd ../../..

# Create src/components files (non-ui)
cd src/components
touch AnalysisResults.tsx
touch AudioUpload.tsx
touch FeaturesSection.tsx
touch HeroSection.tsx
touch NavLink.tsx
touch PresentationBreakdown.tsx
cd ../..

# Create hooks
cd src/hooks
touch use-mobile.tsx
touch use-toast.ts
cd ../..

# Create supabase integrations
cd src/integrations/supabase
touch client.ts
touch types.ts
cd ../../..

# Create lib
cd src/lib
touch utils.ts
cd ../..

# Create pages
cd src/pages
touch Index.tsx
touch NotFound.tsx
cd ../..

# Create test files
cd src/test
touch example.test.ts
touch setup.ts
cd ../..

# Create types
cd src/types
touch presentation.ts
cd ../..

# Create root src files
cd src
touch App.css
touch App.tsx
touch index.css
touch main.tsx
touch vite-env.d.ts
cd ..

# Create supabase functions
cd supabase/functions/process-audio
touch index.ts
cd ../../..
touch supabase/config.toml

# Create root files
touch .gitignore
touch bun.lock
touch components.json
touch eslint.config.js
touch index.html
touch package.json
touch postcss.config.js
touch README.md
touch tailwind.config.ts
touch tsconfig.app.json
touch tsconfig.json
touch tsconfig.node.json
touch vite.config.ts
touch vitest.config.ts

echo "✅ All files and folders created successfully!"