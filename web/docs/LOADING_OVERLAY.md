# Loading Overlay System

A global loading overlay system for displaying loading states throughout the application with a terminal-inspired design.

## Features

- **Global State Management**: Control loading state from anywhere in the app using Context
- **Customizable**: Optional message text, adjustable opacity, different sizes, and color variants
- **Terminal Design**: Rotating spinner in brand orange (or other variant colors)
- **Easy to Use**: Simple hook-based API

## Components

### LoadingContext
Provides global state management for the loading overlay.

**Location**: `src/context/LoadingContext.tsx`

### LoadingOverlay
The visual component that renders the overlay and spinner.

**Location**: `src/components/common/LoadingOverlay.tsx`

### useLoading Hook
Custom hook for controlling the loading overlay.

**Exported from**: `src/context/LoadingContext.tsx`

## Usage

### Basic Usage

```typescript
import { useLoading } from "@/context/LoadingContext";

function MyComponent() {
  const { showLoading, hideLoading } = useLoading();

  const handleAction = async () => {
    showLoading();

    try {
      await someAsyncOperation();
    } finally {
      hideLoading();
    }
  };

  return <button onClick={handleAction}>Do Something</button>;
}
```

### With Message

```typescript
const handleSave = async () => {
  showLoading({ message: "Saving..." });

  try {
    await saveData();
  } finally {
    hideLoading();
  }
};
```

### With Custom Opacity

```typescript
// More transparent (0.5 = 50% opacity)
showLoading({ opacity: 0.5 });

// More opaque (0.9 = 90% opacity)
showLoading({ opacity: 0.9 });
```

### Section-Specific Loading

```typescript
// For loading a specific section instead of fullscreen
showLoading({ size: "section" });
```

**Note**: For section-specific loading, the parent container must have `position: relative`.

### With Color Variants

```typescript
// Default (brand orange)
showLoading({ variant: "default" });

// Info (cyan)
showLoading({ variant: "info", message: "Fetching data..." });

// Success (green)
showLoading({ variant: "success", message: "Processing..." });

// Warning (amber)
showLoading({ variant: "warning", message: "Please wait..." });

// Error (red)
showLoading({ variant: "error", message: "Retrying..." });
```

### Combined Options

```typescript
showLoading({
  message: "Loading services...",
  opacity: 0.85,
  size: "fullscreen",
  variant: "info"
});
```

## API Reference

### `showLoading(options?: LoadingOptions)`

Shows the loading overlay.

**Parameters:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `message` | `string` | `undefined` | Optional message to display below the spinner |
| `opacity` | `number` | `0.75` | Background overlay opacity (0-1) |
| `size` | `"fullscreen" \| "section"` | `"fullscreen"` | Overlay size - fullscreen or section-specific |
| `variant` | `"default" \| "info" \| "success" \| "warning" \| "error"` | `"default"` | Color variant for spinner and text |

### `hideLoading()`

Hides the loading overlay.

### `isLoading`

Boolean indicating if the loading overlay is currently visible.

```typescript
const { isLoading } = useLoading();

if (isLoading) {
  // Loading is active
}
```

## Real-World Examples

### Fetching Data

```typescript
const fetchServices = async () => {
  showLoading({ message: "Loading services...", variant: "info" });

  try {
    const response = await fetch("/api/services");
    const data = await response.json();
    setServices(data);
  } catch (error) {
    console.error("Error fetching services:", error);
  } finally {
    hideLoading();
  }
};
```

### Toggling Service Status

```typescript
const handleToggleStatus = async (serviceFilename: string, action: string) => {
  showLoading({ message: `${action === "start" ? "Starting" : "Stopping"} service...` });

  try {
    await fetch(`/api/services/${serviceFilename}/${action}`, { method: "POST" });
    await refreshServices();
  } finally {
    hideLoading();
  }
};
```

### Multiple Sequential Operations

```typescript
const handleDeploy = async () => {
  try {
    showLoading({ message: "Building application...", variant: "info" });
    await build();

    showLoading({ message: "Running tests..." });
    await runTests();

    showLoading({ message: "Deploying...", variant: "success" });
    await deploy();
  } finally {
    hideLoading();
  }
};
```

## Design Notes

- **z-index**: Fullscreen overlay uses `z-[9999]` to appear above all content
- **Animation**: Spinner uses CSS `animate-spin` for smooth rotation
- **Colors**: Matches the terminal-inspired color palette from `globals.css`
- **Accessibility**: Uses semantic HTML and appropriate ARIA attributes

## Troubleshooting

### Loading overlay not appearing

Ensure `LoadingProvider` is added to your app layout hierarchy (it should wrap all pages).

### Section loading not working

For `size="section"`, ensure the parent container has `position: relative` or `position: absolute`.

### Message not showing

Verify you're passing the `message` option: `showLoading({ message: "Loading..." })`
