# Project TODO

## Core Features
- [x] FIRE calculator with inputs (current balance, growth rate, monthly contribution, monthly expenses, age, retirement age, inflation, safe withdrawal rate)
- [x] Calculate crossover point where investment balance meets FIRE number
- [x] Display projection chart showing balance vs FIRE number over time
- [x] Glassmorphism design implementation
- [ ] File storage integration for saving/loading scenarios

## Database & Backend
- [x] Create database schema for saved scenarios
- [x] Implement tRPC procedures for CRUD operations
- [x] File storage integration using S3

## Frontend
- [x] Update Home page with calculator interface
- [x] Create input form with glassmorphism styling
- [x] Implement chart visualization using Recharts
- [x] Add save/load scenario functionality
- [x] Authentication integration

## Testing
- [x] Write vitest tests for calculator logic
- [x] Write vitest tests for tRPC procedures
- [x] Browser testing


## Bug Fixes
- [x] Add expense line to chart visualization
- [x] Fix inflation tracking for expenses
- [x] Correct FIRE number calculation (investment income vs expenses)
- [x] Add investment income line to chart


## New Features
- [x] Add checkboxes to toggle chart lines visibility
- [x] Dynamically adjust chart based on visible lines

- [x] Stop monthly contributions after FIRE crossover point is reached


## Verification & Testing
- [x] Verify FIRE calculation logic with manual test cases
- [x] Test edge cases (zero contributions, high inflation, etc.)
- [x] Validate contribution stop logic
- [x] Verify inflation calculations
- [x] Check investment income calculations


## Additional Features
- [x] Add scenario presets (Conservative, Moderate, Aggressive)
- [x] Implement CSV export functionality
- [x] Add sensitivity sliders for return rate and contribution amount


## Bug Fixes & Improvements
- [x] Fix save scenario functionality - scenarios now persist and load correctly
- [x] Add dropdown list to load previously saved scenarios
- [x] Populate form fields when scenario is loaded from dropdown
- [x] Add delete scenario button

- [x] Add drag-drop slider for monthly expenses
