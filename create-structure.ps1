# Create main directories
New-Item -ItemType Directory -Force -Path "public"
New-Item -ItemType Directory -Force -Path "src/components/ui"
New-Item -ItemType Directory -Force -Path "src/hooks"
New-Item -ItemType Directory -Force -Path "src/integrations/supabase"
New-Item -ItemType Directory -Force -Path "src/lib"
New-Item -ItemType Directory -Force -Path "src/pages"
New-Item -ItemType Directory -Force -Path "src/test"
New-Item -ItemType Directory -Force -Path "src/types"
New-Item -ItemType Directory -Force -Path "supabase/functions/process-audio"

# Create public directory files
New-Item -ItemType File -Force -Path "public/favicon.ico"
New-Item -ItemType File -Force -Path "public/placeholder.svg"
New-Item -ItemType File -Force -Path "public/robots.txt"

# Create UI components
$uiComponents = @(
    "accordion.tsx", "alert-dialog.tsx", "alert.tsx", "aspect-ratio.tsx",
    "avatar.tsx", "badge.tsx", "breadcrumb.tsx", "button.tsx",
    "calendar.tsx", "card.tsx", "carousel.tsx", "chart.tsx",
    "checkbox.tsx", "collapsible.tsx", "command.tsx", "context-menu.tsx",
    "dialog.tsx", "drawer.tsx", "dropdown-menu.tsx", "form.tsx",
    "hover-card.tsx", "input-otp.tsx", "input.tsx", "label.tsx",
    "menubar.tsx", "navigation-menu.tsx", "pagination.tsx", "popover.tsx",
    "progress.tsx", "radio-group.tsx", "resizable.tsx", "scroll-area.tsx",
    "select.tsx", "separator.tsx", "sheet.tsx", "sidebar.tsx",
    "skeleton.tsx", "slider.tsx", "sonner.tsx", "switch.tsx",
    "table.tsx", "tabs.tsx", "textarea.tsx", "toast.tsx",
    "toaster.tsx", "toggle-group.tsx", "toggle.tsx", "tooltip.tsx",
    "use-toast.ts"
)

foreach ($component in $uiComponents) {
    New-Item -ItemType File -Force -Path "src/components/ui/$component"
}

# Create src/components files (non-ui)
$components = @(
    "AnalysisResults.tsx", "AudioUpload.tsx", "FeaturesSection.tsx",
    "HeroSection.tsx", "NavLink.tsx", "PresentationBreakdown.tsx"
)

foreach ($component in $components) {
    New-Item -ItemType File -Force -Path "src/components/$component"
}

# Create hooks
New-Item -ItemType File -Force -Path "src/hooks/use-mobile.tsx"
New-Item -ItemType File -Force -Path "src/hooks/use-toast.ts"

# Create supabase integrations
New-Item -ItemType File -Force -Path "src/integrations/supabase/client.ts"
New-Item -ItemType File -Force -Path "src/integrations/supabase/types.ts"

# Create lib
New-Item -ItemType File -Force -Path "src/lib/utils.ts"

# Create pages
New-Item -ItemType File -Force -Path "src/pages/Index.tsx"
New-Item -ItemType File -Force -Path "src/pages/NotFound.tsx"

# Create test files
New-Item -ItemType File -Force -Path "src/test/example.test.ts"
New-Item -ItemType File -Force -Path "src/test/setup.ts"

# Create types
New-Item -ItemType File -Force -Path "src/types/presentation.ts"

# Create root src files
New-Item -ItemType File -Force -Path "src/App.css"
New-Item -ItemType File -Force -Path "src/App.tsx"
New-Item -ItemType File -Force -Path "src/index.css"
New-Item -ItemType File -Force -Path "src/main.tsx"
New-Item -ItemType File -Force -Path "src/vite-env.d.ts"

# Create supabase functions
New-Item -ItemType File -Force -Path "supabase/functions/process-audio/index.ts"
New-Item -ItemType File -Force -Path "supabase/config.toml"

# Create root files
$rootFiles = @(
    ".gitignore", "bun.lock", "components.json", "eslint.config.js",
    "index.html", "package.json", "postcss.config.js", "README.md",
    "tailwind.config.ts", "tsconfig.app.json", "tsconfig.json",
    "tsconfig.node.json", "vite.config.ts", "vitest.config.ts"
)

foreach ($file in $rootFiles) {
    New-Item -ItemType File -Force -Path $file
}

Write-Host "✅ All files and folders created successfully!" -ForegroundColor Green