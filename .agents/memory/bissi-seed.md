---
name: Bissi seed credentials
description: Demo login credentials and seeded data for the Bissi dev environment
---

## Login credentials (dev only)
- `admin` / `admin123` — super_admin role, no branch
- `manager1` / `admin123` — branch_manager role, branch 1 (Main Branch)
- `collector1` / `collector123` — collector role, branch 1

## Password hash formula
`sha256(password + "bissi_salt_2024")` — implemented in `routes/auth.ts` hashPassword()

## Seeded data
- 3 branches: Main (Delhi), North (Noida), South (Gurugram)
- 8 customers (REF000001–REF000008)
- 4 collectors
- 4 committees (Diwali monthly, Daily 100, Weekly Gold, Festival)
- 13 tokens + committee_members
- 6 loans (various statuses)
- 120 collections (30 days × 4 per day)
- 5 lotteries (2 completed, 3 scheduled)
