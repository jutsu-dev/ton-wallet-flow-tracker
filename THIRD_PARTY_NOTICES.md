# Third-Party Notices

TON Wallet Flow Tracker depends on open-source software. The main direct dependencies are listed below with their licenses, as published by each project and confirmed against the installed packages. Transitive dependencies are not enumerated here.

For an authoritative, exhaustive report across the whole dependency tree, generate one with a license checker, for example:

```bash
npx license-checker-rseidelsohn --production --summary
# or
npx license-checker --json > third-party-licenses.json
```

## Runtime dependencies

| Package | Version | License |
|---|---|---|
| next | 15.5.20 | MIT |
| react | 19.2.7 | MIT |
| react-dom | 19.2.7 | MIT |
| @xyflow/react | 12.11.2 | MIT |
| @ton/core | 0.63.1 | MIT |
| @prisma/client | 6.19.3 | Apache-2.0 |
| zod | 3.25.76 | MIT |
| @node-rs/argon2 | 2.0.2 | MIT |
| @tanstack/react-query | 5.101.2 | MIT |
| html-to-image | 1.11.13 | MIT |
| lucide-react | 1.24.0 | ISC |
| clsx | 2.1.1 | MIT |
| tailwind-merge | 3.6.0 | MIT |
| server-only | 0.0.1 | MIT |

## Development dependencies

| Package | Version | License |
|---|---|---|
| typescript | 6.0.3 | Apache-2.0 |
| prisma | 6.19.3 | Apache-2.0 |
| tailwindcss | 3.4.19 | MIT |
| postcss | 8.5.19 | MIT |
| autoprefixer | 10.5.2 | MIT |
| vitest | 3.2.7 | MIT |
| @vitest/coverage-v8 | 3.2.7 | MIT |
| @vitejs/plugin-react | 6.0.3 | MIT |
| happy-dom | 20.10.6 | MIT |
| @testing-library/react | 16.3.2 | MIT |
| @testing-library/jest-dom | 6.9.1 | MIT |
| @testing-library/user-event | 14.6.1 | MIT |
| @playwright/test | 1.61.1 | Apache-2.0 |
| msw | 2.15.0 | MIT |
| eslint | 8.57.1 | MIT |
| eslint-config-next | 15.5.20 | MIT |
| prettier | 3.9.5 | MIT |
| prettier-plugin-tailwindcss | 0.8.0 | MIT |
| tsx | 4.23.1 | MIT |

Each dependency remains under its own license; the full license texts are distributed with the packages in `node_modules`. This project itself is licensed under Apache-2.0 (see [LICENSE](LICENSE) and [NOTICE](NOTICE)).
