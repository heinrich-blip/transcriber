# .clinerules/backend.md
---
paths:
  - "src/api/**"
  - "src/services/**"
  - "src/db/**"
---

# Backend Guidelines

- Use dependency injection for services
- All database queries go through repositories
- Return typed errors, not thrown exceptions