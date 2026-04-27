# TS to JS Conversion Fix - TODO

## Phase 1: Config Files
- [ ] Fix `eslint.config.js` - remove typescript-eslint
- [ ] Fix `package.json` - remove TS-related devDependencies

## Phase 2: Bulk UI Component Fixes (Node.js script)
- [ ] Create and run script to fix common patterns across `src/components/ui/*.jsx`
  - Remove `type` keyword from imports
  - Remove generic parameters from `React.forwardRef`
  - Remove generic parameters from `React.createContext`
  - Remove `type`/`interface` declarations
  - Remove `type` from export statements
  - Remove type assertions
  - Fix broken parameter syntax

## Phase 3: Manual Complex File Fixes
- [ ] Fix `src/components/ui/form.jsx`
- [ ] Fix `src/components/ui/carousel.jsx`
- [ ] Fix `src/components/ui/pagination.jsx`
- [ ] Fix `src/components/ui/command.jsx`
- [ ] Fix `src/components/ui/breadcrumb.jsx`
- [ ] Fix `src/components/ui/drawer.jsx`
- [ ] Fix `src/components/ui/dialog.jsx`
- [ ] Fix `src/components/ui/calendar.jsx`
- [ ] Fix `src/components/ui/badge.jsx`
- [ ] Fix `src/components/ui/label.jsx`

## Phase 4: Other Files
- [ ] Fix `src/test/setup.js`
- [ ] Verify remaining UI components are clean

## Phase 5: Verification
- [ ] Run `npm install`
- [ ] Run `npm run lint` or `npm run dev` to verify

