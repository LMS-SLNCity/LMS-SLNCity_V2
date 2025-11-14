# LMS Color Scheme Guide

## Brand Colors

### Primary Colors
- **Brand Primary (Green)**: `#16a34a` (green-600)
  - Hover: `#15803d` (green-700)
  - Light: `#f0fdf4` (green-50)
  - Use for: Primary actions, success states, approved status

- **Brand Secondary (Red)**: `#dc2626` (red-600)
  - Use for: Branding, headers, important text

### Status Colors

#### Test Status
- **PENDING**: Gray (`#9ca3af` / gray-400)
  - Background: `bg-gray-200`
  - Text: `text-gray-700`

- **SAMPLE_COLLECTED**: Blue (`#3b82f6` / blue-500)
  - Background: `bg-blue-200`
  - Text: `text-blue-700`

- **REJECTED**: Red (`#ef4444` / red-500)
  - Background: `bg-red-200`
  - Text: `text-red-700`

- **IN_PROGRESS**: Yellow (`#eab308` / yellow-500)
  - Background: `bg-yellow-200`
  - Text: `text-yellow-700`

- **AWAITING_APPROVAL**: Orange (`#f97316` / orange-500)
  - Background: `bg-orange-200`
  - Text: `text-orange-700`

- **APPROVED**: Green (`#22c55e` / green-500)
  - Background: `bg-green-200`
  - Text: `text-green-700`

- **COMPLETED**: Purple (`#a855f7` / purple-500)
  - Background: `bg-purple-200`
  - Text: `text-purple-700`

### Action Colors

#### Audit Log Actions
- **CREATE**: Green (`bg-green-100 text-green-800`)
- **UPDATE/EDIT**: Blue (`bg-blue-100 text-blue-800`)
- **DELETE**: Red (`bg-red-100 text-red-800`)
- **APPROVE**: Purple (`bg-purple-100 text-purple-800`)
- **REJECT**: Orange (`bg-orange-100 text-orange-800`)
- **LOGIN**: Indigo (`bg-indigo-100 text-indigo-800`)
- **DEFAULT**: Gray (`bg-gray-100 text-gray-800`)

### Dashboard Metrics
- **Blue Metrics**: Revenue, Total Visits
  - Border: `border-blue-200`
  - Value: `text-blue-600`

- **Orange Metrics**: Pending Tests
  - Border: `border-orange-200`
  - Value: `text-orange-600`

- **Green Metrics**: Approved Tests, Collection Rate
  - Border: `border-green-200`
  - Value: `text-green-600`

- **Red Metrics**: Rejected Tests
  - Border: `border-red-200`
  - Value: `text-red-600`

- **Purple Metrics**: Average TAT
  - Border: `border-purple-200`
  - Value: `text-purple-600`

### Queue Cards
- **Phlebotomy Queue**: Yellow/Amber
  - Background: `bg-amber-50`
  - Border: `border-amber-300`
  - Hover: `hover:border-amber-400`
  - Count: `text-amber-700`

- **Lab Queue**: Blue
  - Background: `bg-blue-50`
  - Border: `border-blue-300`
  - Hover: `hover:border-blue-400`
  - Count: `text-blue-700`

- **Approver Queue**: Green/Emerald
  - Background: `bg-emerald-50`
  - Border: `border-emerald-300`
  - Hover: `hover:border-emerald-400`
  - Count: `text-emerald-700`

### Sensitivity Results (Microbiology)
- **Sensitive (S)**: Green
  - `text-green-700 bg-green-50`

- **Resistant (R)**: Red
  - `text-red-700 bg-red-50`

- **Intermediate (I)**: Yellow
  - `text-yellow-700 bg-yellow-50`

## Gray Scale
- **50**: `#f8fafc` - Lightest backgrounds
- **100**: `#f1f5f9` - Light backgrounds
- **200**: `#e2e8f0` - Borders, dividers
- **300**: `#cbd5e1` - Disabled states
- **400**: `#94a3b8` - Placeholder text
- **500**: `#64748b` - Secondary text
- **600**: `#475569` - Primary text
- **700**: `#334155` - Headings
- **800**: `#1e293b` - Dark text
- **900**: `#0f172a` - Darkest text

## Usage Guidelines

### Buttons
- **Primary Action**: `bg-brand-primary hover:bg-brand-primary_hover text-white`
- **Secondary Action**: `bg-gray-200 hover:bg-gray-300 text-gray-800`
- **Danger Action**: `bg-red-600 hover:bg-red-700 text-white`
- **Success Action**: `bg-green-600 hover:bg-green-700 text-white`

### Forms
- **Focus Ring**: `focus:ring-brand-primary focus:border-brand-primary`
- **Error State**: `border-red-500 focus:ring-red-500`
- **Success State**: `border-green-500 focus:ring-green-500`

### Backgrounds
- **Page Background**: `bg-gray-50`
- **Card Background**: `bg-white`
- **Header Background**: `bg-white`
- **Section Background**: `bg-gray-100`

### Text
- **Primary Text**: `text-gray-900`
- **Secondary Text**: `text-gray-600`
- **Muted Text**: `text-gray-500`
- **Link Text**: `text-brand-primary hover:text-brand-primary_hover`

## Consistency Rules

1. **Always use Tailwind color classes** instead of custom hex values
2. **Use semantic color names** (e.g., `bg-brand-primary` instead of `bg-green-600`)
3. **Maintain contrast ratios** for accessibility (WCAG AA minimum)
4. **Use consistent hover states** (typically one shade darker)
5. **Status colors should match** across all components (badges, circles, cards)
6. **Dashboard metrics** should use the same color scheme as defined above
7. **Queue cards** should use distinct colors for easy visual identification

## Tailwind Config

The main color configuration is in `index.html`:

```javascript
tailwind.config = {
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#16a34a',        // Green 600
          primary_hover: '#15803d',  // Green 700
          secondary: '#dc2626',      // Red 600
          light: '#f0fdf4',          // Green 50
        },
        gray: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        }
      }
    }
  }
}
```

## Migration Notes

When updating existing components:
1. Replace custom hex colors with Tailwind classes
2. Use `brand-primary` instead of `green-600` for primary actions
3. Use `brand-secondary` instead of `red-600` for branding
4. Ensure all status badges use the defined status colors
5. Update dashboard metrics to use consistent border and value colors

