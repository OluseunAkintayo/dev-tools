# NexTools

**The small developer jobs, done in your browser.** Format JSON, decode a JWT, convert YAML, test a regex or hash a file without pasting your data into someone else's server.

**[nextools.vercel.app](https://nextools.vercel.app)**

Every tool works the same way: paste or drop a file on the left, and the result appears on the right as you type. Errors point to the exact line. One click copies or downloads the result, or sends it to the next tool.

## Why NexTools

- **Paste anything, get the right tool.** The box on the home page recognises what you paste (JSON, CSV, XML, YAML, a JWT, a URL, percent-encoded text, a Unix timestamp, a UUID or Base64) and opens the matching tool with your data already in it.
- **Your data stays on your machine.** Inputs, files and keys are processed in the browser tab and never uploaded. Heavy work, such as hashing a large file or running a risky regex, happens in a Web Worker so the page stays responsive.
- **Live results.** There's no Submit button. Output updates as you type, and large inputs switch to on-demand runs so typing never lags.
- **Errors you can act on.** Messages name the line and column and highlight it, and common mistakes come with one-click fixes, such as removing trailing commas from JSON.
- **Tools that hand off to each other.** Format JSON, then send it to the TypeScript or Zod generator. Decode a JWT, then open its payload in the formatter. Parse a URL, then open its query as JSON.
- **Keyboard first.** <kbd>⌘</kbd> <kbd>K</kbd> (or <kbd>Ctrl</kbd> <kbd>K</kbd>) opens any tool. <kbd>⌘</kbd> <kbd>↵</kbd> runs, and <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>↵</kbd> copies the result.
- **Works offline.** After your first visit, every tool works without a connection. You can also install NexTools as an app from your browser's address bar or Share menu.
- **Light and dark themes.** NexTools follows your system setting, or you can pick one.

## Tools

### Format
| Tool | What it does |
|---|---|
| [JSON Formatter](https://nextools.vercel.app/json-formatter) | Pretty-print with 2 or 4 spaces or tabs, or minify. Sort keys, browse a collapsible tree, and query with JSONPath (`$.items[*].name`). |

### Convert
| Tool | What it does |
|---|---|
| [CSV to JSON](https://nextools.vercel.app/csv-to-json) | Any delimiter. Detects number and boolean columns, and turns `address.city` headers into nested objects. |
| [JSON to CSV](https://nextools.vercel.app/json-to-csv) | Flattens nested objects into dotted columns, with a table preview. |
| [XML to JSON](https://nextools.vercel.app/xml-to-json) and [JSON to XML](https://nextools.vercel.app/json-to-xml) | Both directions, with indented output and located parse errors. |
| [YAML to JSON](https://nextools.vercel.app/yaml-to-json) and [JSON to YAML](https://nextools.vercel.app/json-to-yaml) | Expands anchors, aliases and merge keys, and handles multi-document files. JSON to YAML quotes values like `yes` and `on` so older parsers don't read them as booleans. |
| [Timestamp Converter](https://nextools.vercel.app/timestamp-converter) | Converts Unix seconds, ms, µs or ns and ISO dates to nine formats, in any time zone, with a searchable zone picker. |

### Generate
| Tool | What it does |
|---|---|
| [TS Interface Generator](https://nextools.vercel.app/json-to-interface) | Turns a JSON sample into TypeScript interfaces. |
| [JSON to Zod](https://nextools.vercel.app/json-to-zod) | Generates a Zod 4 or Zod 3 schema. Keys missing from some array items become optional, varying types become unions, and emails, URLs, UUIDs and dates are detected. |
| [Hash Generator](https://nextools.vercel.app/hash-generator) | Computes MD5, SHA-1, SHA-256, SHA-384 and SHA-512 for text or files up to 1 GB, plus HMAC. Paste a checksum to verify a download. |
| [UUID Generator](https://nextools.vercel.app/uuid-generator) | Generates up to 1,000 v4 or time-ordered v7 UUIDs. The inspector shows any UUID's version and creation time. |

### Encode
| Tool | What it does |
|---|---|
| [Base64 Encoder / Decoder](https://nextools.vercel.app/base64-encoder-decoder) | Handles UTF-8 and URL-safe Base64. |
| [JWT Encoder / Decoder](https://nextools.vercel.app/jwt) | Decodes claims with readable expiry times, and verifies or signs tokens using HS, RS, PS, ES or EdDSA, with a secret, PEM key, JWK or JWKS. It can also generate test keys. |
| [URL Encoder / Decoder](https://nextools.vercel.app/url-encoder-decoder) | Encodes as a component, a full URL or form data. Parse mode splits a URL into its parts, with an editable query table. |

### Compare
| Tool | What it does |
|---|---|
| [JSON Diff](https://nextools.vercel.app/json-diff) | Lists every added, removed and changed value by path. Key order is ignored. Arrays are aligned the way `git diff` aligns lines, so one inserted item counts as one change. |

### Test
| Tool | What it does |
|---|---|
| [Regex Tester](https://nextools.vercel.app/regex-tester) | Live match highlighting, capture groups and a replace preview, plus 41 ready-made patterns for numbers, emails, phone numbers, special characters, dates and more. A pattern that runs away is stopped after 1.5 seconds. |

## Privacy

What you paste, drop or type into a tool is processed in your browser and is not sent anywhere. The site itself uses [Vercel Web Analytics](https://vercel.com/docs/analytics) to count anonymous page views. That's the only data the site collects. The [privacy policy](https://nextools.vercel.app/privacy) has the details.

## Run it locally

You'll need Node.js 24 or later and [Yarn 1](https://classic.yarnpkg.com/).

```bash
git clone https://github.com/OluseunAkintayo/dev-tools.git
cd dev-tools
yarn install
yarn dev          # http://localhost:5173
```

| Command | Purpose |
|---|---|
| `yarn dev` | Start the dev server with hot reload |
| `yarn build` | Type-check and build to `dist/` |
| `yarn preview` | Serve the production build locally |
| `yarn lint` | Run ESLint |

### Testing offline mode

The dev server runs without the service worker, so offline mode only works on a production build:

```bash
yarn build && yarn preview   # http://localhost:4173
```

Open the page once so the app is saved for offline use. Then, in your browser's developer tools, set Network to **Offline** (or stop the preview server) and reload. Every tool should still load and work. To try the update prompt, run `yarn build` again while the page is open.


## Roadmap

- Shadcn theme generator, with HSL (Tailwind v3) and OKLCH (Tailwind v4) output
- XML to CSV
- A GitHub Actions workflow builder
- Inputs that survive a refresh, and shareable links

<!-- ## Built with

[React](https://react.dev) 18, [TypeScript](https://www.typescriptlang.org), [Vite](https://vitejs.dev), [Tailwind CSS](https://tailwindcss.com), [Radix UI](https://www.radix-ui.com) primitives in the [shadcn/ui](https://ui.shadcn.com) style, and [Lucide](https://lucide.dev) icons. The [yaml](https://eemeli.org/yaml/) and [x2js](https://github.com/abdmob/x2js) libraries handle conversions, and the browser's Web Crypto API handles hashing and JWTs. -->

---

Made by [TechyDNA](https://techydna.vercel.app/).
