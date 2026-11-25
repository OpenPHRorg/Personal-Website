window.EXEC_OPS_DASHBOARD = {
  "exportedAt": "2026-11-25T17:44:40+00:00",
  "telemetry": {
    "exportedAt": "2026-11-25T17:44:40+00:00",
    "totalCycles": 6,
    "readyForWebsiteShowcase": true,
    "passRatePct": 33.3,
    "modelCalls": {
      "pro": 1,
      "flash": 15,
      "flash_lite": 10,
      "total": 26,
      "flashOrLiteSharePct": 96.2
    },
    "cyclesByProject": {
      "openphr": 6
    },
    "recentRuns": [
      {
        "timestamp": "2026-11-25T06:03:31+00:00",
        "localDate": "2026-11-24",
        "mode": "standup",
        "projects": [
          "openphr"
        ],
        "calls": {
          "pro": 1,
          "flash": 0,
          "flash_lite": 0
        },
        "outcome": "dry-run",
        "summary": "Standup complete. Selected=['openphr']. Selected `openphr` (1 of 1 allowed by budget.json `maxProjectsPerCycle: 1`; `cyclesToday: 0`, `remainingCyclesToday: 2`) as the highest-ROI project. `openphr` is the only project with `driveStatus: \"o"
      },
      {
        "timestamp": "2026-11-25T06:25:11+00:00",
        "localDate": "2026-11-24",
        "mode": "execute",
        "projects": [
          "openphr"
        ],
        "calls": {
          "pro": 0,
          "flash": 3,
          "flash_lite": 2
        },
        "outcome": "pass",
        "summary": "Execute cycle (pass) on ['openphr']: 2 work orders."
      },
      {
        "timestamp": "2026-11-25T06:30:14+00:00",
        "localDate": "2026-11-24",
        "mode": "execute",
        "projects": [
          "openphr"
        ],
        "calls": {
          "pro": 0,
          "flash": 3,
          "flash_lite": 2
        },
        "outcome": "fail",
        "summary": "Execute cycle (fail) on ['openphr']: 2 work orders."
      },
      {
        "timestamp": "2026-11-25T06:35:23+00:00",
        "localDate": "2026-11-24",
        "mode": "execute",
        "projects": [
          "openphr"
        ],
        "calls": {
          "pro": 0,
          "flash": 3,
          "flash_lite": 2
        },
        "outcome": "fail",
        "summary": "Execute cycle (fail) on ['openphr']: 2 work orders."
      },
      {
        "timestamp": "2026-11-25T06:42:02+00:00",
        "localDate": "2026-11-24",
        "mode": "execute",
        "projects": [
          "openphr"
        ],
        "calls": {
          "pro": 0,
          "flash": 3,
          "flash_lite": 2
        },
        "outcome": "pass",
        "summary": "Execute cycle (pass) on ['openphr']: 2 work orders."
      },
      {
        "timestamp": "2026-11-25T06:45:26+00:00",
        "localDate": "2026-11-24",
        "mode": "execute",
        "projects": [
          "openphr"
        ],
        "calls": {
          "pro": 0,
          "flash": 3,
          "flash_lite": 2
        },
        "outcome": "fail",
        "summary": "Execute cycle (fail) on ['openphr']: 2 work orders."
      }
    ]
  },
  "framework": {
    "tiers": [
      {
        "tier": "0",
        "role": "Zero-Token Pre-Flight Bot",
        "model": "deterministic (0 tokens)",
        "responsibility": "Generates compact < 8 KB repository snapshot and checks daily quota before invoking any LLM."
      },
      {
        "tier": "1",
        "role": "Chief of Staff",
        "model": "pro (<= 1 call/cycle)",
        "responsibility": "Reads snapshot, task board, and budget only; selects <= maxProjectsPerCycle highest-ROI area."
      },
      {
        "tier": "2",
        "role": "Domain Project Managers",
        "model": "flash",
        "responsibility": "Reads scoped brief + targeted files to plan <= 2 atomic, independently verifiable work orders."
      },
      {
        "tier": "3",
        "role": "Builder, Verifier & Scout Workers",
        "model": "flash / flash_lite",
        "responsibility": "Executes isolated work orders and runs syntax, test, and privacy checks before certifying PASS."
      }
    ],
    "governance": {
      "dailyMaxCycles": 2,
      "maxProjectsPerCycle": 1,
      "maxWorkersPerManager": 2,
      "maxCallsPerCycle": {
        "pro": 1,
        "flash": 4,
        "flash_lite": 4
      }
    }
  },
  "strategy": {
    "cadence": "manual_or_1x_daily_standup",
    "modelPolicy": {
      "chief-of-staff": "pro",
      "mgr-openphr": "flash",
      "mgr-public-investing": "flash",
      "mgr-venture-capital": "flash",
      "mgr-personal-website": "flash",
      "mgr-civic-tools": "flash",
      "mgr-vivid-vision": "flash",
      "worker-builder": "flash",
      "worker-verifier": "flash_lite",
      "worker-scout": "flash_lite"
    },
    "antiBurnRules": [
      "Always run zero-token Executive Ops snapshot.py before invoking any LLM.",
      "Never spawn swarm or sub-3-hour cron loops for routine maintenance.",
      "Default to mode=plan (dry-run) for new tasks; only switch to mode=execute after confirming scope.",
      "Skip clean/idle projects with zero pending backlog items (0 tokens spent).",
      "Private projects (visibility=private) are never exported to public showcase metrics or unencrypted pages."
    ],
    "priorityRubric": [
      {
        "level": "P0",
        "label": "Ship-Blocker & Active Release",
        "criteria": "Immediate release readiness, CI/verification gates, working-tree hygiene, or flagship advisory deliverables."
      },
      {
        "level": "P1",
        "label": "Core Platform & Audit Health",
        "criteria": "Primary build/lint health, statutory & financial data audits, clinical engine integrity, and core partnership readiness."
      },
      {
        "level": "P2",
        "label": "Automation & Parity Hardening",
        "criteria": "Strict typing, automated earnings/filing ingestion, CI checks for static apps, and competitive positioning updates."
      },
      {
        "level": "P3",
        "label": "Performance, Tooling & Exports",
        "criteria": "Static page-weight optimization, schema regression suites, zero-token telemetry syncs, and evidence synthesis kits."
      },
      {
        "level": "P4",
        "label": "Coverage & Analytics Expansion",
        "criteria": "New metro coverage, peer-comparison synthesis, cross-fund dispersion monitoring, and visual trend tracking."
      },
      {
        "level": "P5",
        "label": "Long-Horizon Watchlist & R&D",
        "criteria": "Optional third-party API activation, legacy prototype archival, and automated regulatory/sector horizon scanning."
      }
    ],
    "rhythms": [
      {
        "name": "1. Morning Standup",
        "cost": "0\u20131 Pro call",
        "summary": "Zero-token snapshot.py pre-flight followed by optional cross-portfolio Chief of Staff triage."
      },
      {
        "name": "2. Scoped Project Sprint",
        "cost": "Plan first -> Execute",
        "summary": "Pin one area to skip Pro triage (0 Pro calls), review 1\u20132 atomic work orders, then execute with independent verification."
      },
      {
        "name": "3. Weekly Hygiene & Export",
        "cost": "0 LLM tokens",
        "summary": "Refresh snapshot and run showcase-export --publish-dir to publish verified public telemetry & P0\u2013P5 progress."
      }
    ]
  },
  "summary": {
    "publicAreasCount": 6,
    "totalTasks": 39,
    "doneTasks": 6,
    "activeTasks": 0,
    "backlogTasks": 33,
    "completionPct": 15.4,
    "priorityTotals": {
      "P0": {
        "total": 6,
        "done": 1,
        "open": 5
      },
      "P1": {
        "total": 9,
        "done": 4,
        "open": 5
      },
      "P2": {
        "total": 6,
        "done": 1,
        "open": 5
      },
      "P3": {
        "total": 6,
        "done": 0,
        "open": 6
      },
      "P4": {
        "total": 6,
        "done": 0,
        "open": 6
      },
      "P5": {
        "total": 6,
        "done": 0,
        "open": 6
      }
    }
  },
  "areas": [
    {
      "id": "openphr",
      "name": "OpenPHR & CareHub",
      "domain": "openphr.org",
      "url": "https://openphr.org",
      "kind": "git",
      "manager": "mgr-openphr",
      "stack": "Next.js 16, React 19, Prisma, Node/Python scripts",
      "deploy": "GitHub Pages / OpenPHRorg/OpenPHRorg.github.io",
      "driveStatus": "ok",
      "health": "clean",
      "branch": "main",
      "dirtyFiles": 0,
      "lastCommit": {
        "hash": "d85bbe5e76b",
        "date": "2026-11-24",
        "subject": "Add pre-build and post-build CI verification gates to deploy-pages workflow (OPS"
      },
      "counts": {
        "backlog": 5,
        "active": 0,
        "done": 4,
        "total": 9
      },
      "prioritySummary": {
        "P0": {
          "total": 1,
          "done": 0,
          "open": 1
        },
        "P1": {
          "total": 4,
          "done": 4,
          "open": 0
        },
        "P2": {
          "total": 1,
          "done": 0,
          "open": 1
        },
        "P3": {
          "total": 1,
          "done": 0,
          "open": 1
        },
        "P4": {
          "total": 1,
          "done": 0,
          "open": 1
        },
        "P5": {
          "total": 1,
          "done": 0,
          "open": 1
        }
      },
      "tasks": [
        {
          "id": "OPS-010",
          "priority": "P0",
          "size": "S",
          "status": "backlog",
          "title": "Push verified local commits (OPS-007\u2013OPS-009) to origin/main and confirm live GitHub Pages CI passes all pre/post-build gates",
          "acceptanceCriteria": "origin/main matches local main and deploy-pages.yml workflow completes green end-to-end.",
          "createdAt": "2026-11-25"
        },
        {
          "id": "OPS-001",
          "priority": "P1",
          "size": "S",
          "status": "done",
          "title": "Audit clinical verification gate and Next.js 16 lint health",
          "acceptanceCriteria": "Confirm node scripts/verify_clinical_engine.js and npm run lint pass cleanly on [local-path]",
          "createdAt": "2026-11-24"
        },
        {
          "id": "OPS-007",
          "priority": "P1",
          "size": "S",
          "status": "done",
          "title": "Eliminate 38 orphan sitemap URLs by linking Parkinson's Drugs, Matrix, and Medical Necessity hubs from homepage",
          "acceptanceCriteria": "verify_indexation_seo.js reports 0 Orphan sitemap URLs (>2 clicks from /) and verify_pivot_platform.js exits 0",
          "createdAt": "2026-11-24"
        },
        {
          "id": "OPS-008",
          "priority": "P1",
          "size": "M",
          "status": "done",
          "title": "Eliminate @typescript-eslint/no-explicit-any errors in src/lib/ core engines",
          "acceptanceCriteria": "eslint src/lib reports 0 errors, tsc --noEmit exits 0, verify_clinical_engine.js passes 9/9",
          "createdAt": "2026-11-24"
        },
        {
          "id": "OPS-009",
          "priority": "P1",
          "size": "S",
          "status": "done",
          "title": "Add tsc, clinical engine, and 22-section pivot verification gates to deploy-pages.yml CI",
          "acceptanceCriteria": "deploy-pages.yml runs tsc --noEmit, eslint src/lib, verify_clinical_engine.js, and verify_pivot_platform.js before next build",
          "createdAt": "2026-11-24"
        },
        {
          "id": "OPS-011",
          "priority": "P2",
          "size": "L",
          "status": "backlog",
          "title": "Eliminate remaining @typescript-eslint/no-explicit-any errors across src/app/ and src/components/",
          "acceptanceCriteria": "eslint.cmd src exits 0 with zero explicit-any errors across UI components and pages.",
          "createdAt": "2026-11-25"
        },
        {
          "id": "OPS-012",
          "priority": "P3",
          "size": "M",
          "status": "backlog",
          "title": "Reduce homepage static HTML weight from 293.5 KB toward < 200 KB performance target",
          "acceptanceCriteria": "verify_indexation_seo.js reports homepage weight under 200 KB with 0 orphan sitemap URLs.",
          "createdAt": "2026-11-25"
        },
        {
          "id": "OPS-013",
          "priority": "P4",
          "size": "L",
          "status": "backlog",
          "title": "Expand CareHub metro guides and automated clinical trial refresh beyond Phoenix, Bay Area, and Oklahoma",
          "acceptanceCriteria": "Add new metro care-setting datasets while passing verify_pivot_platform.js parity checks.",
          "createdAt": "2026-11-25"
        },
        {
          "id": "OPS-014",
          "priority": "P5",
          "size": "S",
          "status": "backlog",
          "title": "Evaluate clearinghouse API activation once zero-budget nonprofit constraint permits",
          "acceptanceCriteria": "Document vendor pricing and HIPAA/BAA readiness before lifting zero-spend feature flag.",
          "createdAt": "2026-11-25"
        }
      ]
    },
    {
      "id": "public-investing",
      "name": "AI Investing (Public Equities)",
      "domain": "investing.calebli.com",
      "url": "https://investing.calebli.com",
      "kind": "git",
      "manager": "mgr-public-investing",
      "stack": "Static HTML/JS/CSS, Python analytics & earnings pipelines",
      "deploy": "GitHub Pages / OpenPHRorg/public-investing",
      "driveStatus": "ok",
      "health": "clean",
      "branch": "main",
      "dirtyFiles": 0,
      "lastCommit": {
        "hash": "6658f21",
        "date": "2026-11-08",
        "subject": "feat: incorporate Q3 2026 earnings actuals, blowout prints, updated price data, "
      },
      "counts": {
        "backlog": 6,
        "active": 0,
        "done": 0,
        "total": 6
      },
      "prioritySummary": {
        "P0": {
          "total": 1,
          "done": 0,
          "open": 1
        },
        "P1": {
          "total": 1,
          "done": 0,
          "open": 1
        },
        "P2": {
          "total": 1,
          "done": 0,
          "open": 1
        },
        "P3": {
          "total": 1,
          "done": 0,
          "open": 1
        },
        "P4": {
          "total": 1,
          "done": 0,
          "open": 1
        },
        "P5": {
          "total": 1,
          "done": 0,
          "open": 1
        }
      },
      "tasks": [
        {
          "id": "OPS-015",
          "priority": "P0",
          "size": "S",
          "status": "backlog",
          "title": "Enforce pre-publish verification gate (node --check app.js + py scripts/financial_audit.py) on every earnings release",
          "acceptanceCriteria": "Confirm clean pre-publish check workflow before updating investing.calebli.com snapshots.",
          "createdAt": "2026-11-25"
        },
        {
          "id": "OPS-002",
          "priority": "P1",
          "size": "S",
          "status": "backlog",
          "title": "Validate app.js syntax and Q3 2026 financial audit gate",
          "acceptanceCriteria": "Confirm node --check app.js and py scripts/financial_audit.py pass without model schema errors.",
          "createdAt": "2026-11-24"
        },
        {
          "id": "OPS-016",
          "priority": "P2",
          "size": "M",
          "status": "backlog",
          "title": "Automate Q4 2026 earnings actuals ingestion and valuation multiple refresh",
          "acceptanceCriteria": "Update covered company models cleanly and pass financial_audit.py validation.",
          "createdAt": "2026-11-25"
        },
        {
          "id": "OPS-017",
          "priority": "P3",
          "size": "M",
          "status": "backlog",
          "title": "Add regression test suite for financial model schema consistency across covered equities",
          "acceptanceCriteria": "Automated schema tests verify required valuation keys and clean numeric ranges.",
          "createdAt": "2026-11-25"
        },
        {
          "id": "OPS-018",
          "priority": "P4",
          "size": "M",
          "status": "backlog",
          "title": "Build agentic peer-comparison memo synthesizer comparing quarterly guidance revisions",
          "acceptanceCriteria": "Generate cited quarter-over-quarter guidance delta summaries inside existing static UI.",
          "createdAt": "2026-11-25"
        },
        {
          "id": "OPS-019",
          "priority": "P5",
          "size": "S",
          "status": "backlog",
          "title": "Maintain long-horizon sector expansion watchlist beyond core public equity coverage",
          "acceptanceCriteria": "Track candidate ticker thesis memos ready for future coverage onboarding.",
          "createdAt": "2026-11-25"
        }
      ]
    },
    {
      "id": "venture-capital",
      "name": "VC Intelligence (Mutual Fund Valuations)",
      "domain": "vc.calebli.com",
      "url": "https://vc.calebli.com",
      "kind": "git",
      "manager": "mgr-venture-capital",
      "stack": "Static dashboards (sequoia/greenlight), Python/backend scripts",
      "deploy": "GitHub Pages / OpenPHRorg/financial-ledger",
      "driveStatus": "ok",
      "health": "active_diff",
      "branch": "main",
      "dirtyFiles": 1,
      "lastCommit": {
        "hash": "b28af6f",
        "date": "2026-07-23",
        "subject": "chore: update script paths to venture-capital"
      },
      "counts": {
        "backlog": 6,
        "active": 0,
        "done": 0,
        "total": 6
      },
      "prioritySummary": {
        "P0": {
          "total": 1,
          "done": 0,
          "open": 1
        },
        "P1": {
          "total": 1,
          "done": 0,
          "open": 1
        },
        "P2": {
          "total": 1,
          "done": 0,
          "open": 1
        },
        "P3": {
          "total": 1,
          "done": 0,
          "open": 1
        },
        "P4": {
          "total": 1,
          "done": 0,
          "open": 1
        },
        "P5": {
          "total": 1,
          "done": 0,
          "open": 1
        }
      },
      "tasks": [
        {
          "id": "OPS-020",
          "priority": "P0",
          "size": "S",
          "status": "backlog",
          "title": "Audit and reconcile uncommitted working-tree diff before next mutual fund mark refresh",
          "acceptanceCriteria": "git status clean on venture-capital repo with check_schema.py passing.",
          "createdAt": "2026-11-25"
        },
        {
          "id": "OPS-021",
          "priority": "P1",
          "size": "M",
          "status": "backlog",
          "title": "Verify quarterly N-PORT mutual fund holdings ingestion and late-stage mark freshness",
          "acceptanceCriteria": "Confirm latest SEC N-PORT filing dates and valuation marks sync across tracked portfolios.",
          "createdAt": "2026-11-25"
        },
        {
          "id": "OPS-003",
          "priority": "P2",
          "size": "S",
          "status": "backlog",
          "title": "Verify mutual fund valuation schema and dashboard consistency",
          "acceptanceCriteria": "Confirm py -m py_compile scripts/check_schema.py passes cleanly across sequoia-dashboard and greenlight-dashboard.",
          "createdAt": "2026-11-24"
        },
        {
          "id": "OPS-022",
          "priority": "P3",
          "size": "M",
          "status": "backlog",
          "title": "Harmonize shared UI layout and metadata parity across Sequoia and Greenlight dashboards",
          "acceptanceCriteria": "Shared component conventions and responsive tables verified across both fund views.",
          "createdAt": "2026-11-25"
        },
        {
          "id": "OPS-023",
          "priority": "P4",
          "size": "M",
          "status": "backlog",
          "title": "Add cross-fund dispersion alert flagging >15% valuation mark divergence across funds",
          "acceptanceCriteria": "Highlight multi-fund mark spread outliers automatically in check_schema.py output.",
          "createdAt": "2026-11-25"
        },
        {
          "id": "OPS-024",
          "priority": "P5",
          "size": "S",
          "status": "backlog",
          "title": "Evaluate adding secondary-market pricing comps alongside quarterly N-PORT filings",
          "acceptanceCriteria": "Document public secondary-price data sources and comparability caveats.",
          "createdAt": "2026-11-25"
        }
      ]
    },
    {
      "id": "personal-website",
      "name": "Personal Website & Profile",
      "domain": "calebli.com",
      "url": "https://calebli.com",
      "kind": "git",
      "manager": "mgr-personal-website",
      "stack": "Static HTML/Tailwind CDN, minimal personal showcase",
      "deploy": "GitHub Pages / OpenPHRorg/Personal-Website",
      "driveStatus": "ok",
      "health": "active_diff",
      "branch": "main",
      "dirtyFiles": 1,
      "lastCommit": {
        "hash": "aabb8ec",
        "date": "2026-11-22",
        "subject": "Revert \"Restructure site for Corporate VC & M&A Consulting, Startup Advisory, Ad"
      },
      "counts": {
        "backlog": 4,
        "active": 0,
        "done": 2,
        "total": 6
      },
      "prioritySummary": {
        "P0": {
          "total": 1,
          "done": 1,
          "open": 0
        },
        "P1": {
          "total": 1,
          "done": 0,
          "open": 1
        },
        "P2": {
          "total": 1,
          "done": 1,
          "open": 0
        },
        "P3": {
          "total": 1,
          "done": 0,
          "open": 1
        },
        "P4": {
          "total": 1,
          "done": 0,
          "open": 1
        },
        "P5": {
          "total": 1,
          "done": 0,
          "open": 1
        }
      },
      "tasks": [
        {
          "id": "OPS-036",
          "priority": "P0",
          "size": "M",
          "status": "done",
          "title": "Publish Executive Ops Framework, Strategy & P0\u2013P5 Tracking Dashboard tab on calebli.com/executive-ops/ with automated privacy guardrails",
          "acceptanceCriteria": "Live executive-ops/ page renders framework, strategy, telemetry, and P0-P5 matrix across 6 public areas; verify_dashboard.mjs passes with zero confidential leaks.",
          "createdAt": "2026-11-25"
        },
        {
          "id": "OPS-037",
          "priority": "P1",
          "size": "S",
          "status": "backlog",
          "title": "Keep root index.html minimal, non-salesy, and aligned with live personal projects and GitHub Pages CI",
          "acceptanceCriteria": "Root index.html maintains personal project showcase posture and clean navigation to all sub-pages.",
          "createdAt": "2026-11-25"
        },
        {
          "id": "OPS-004",
          "priority": "P2",
          "size": "M",
          "status": "done",
          "title": "Publish AI Operating System showcase page after 5+ verified runs",
          "acceptanceCriteria": "Export real telemetry via ops_cli.py showcase-export (>= 5 logged public runs) and publish standalone subfolder on calebli.com without changing root index.html pitch posture.",
          "createdAt": "2026-11-24"
        },
        {
          "id": "OPS-038",
          "priority": "P3",
          "size": "S",
          "status": "backlog",
          "title": "Automate zero-token ops_cli.py showcase-export --publish-dir sync into executive-ops/data/ after weekly cycles",
          "acceptanceCriteria": "Run ops_cli.py showcase-export --publish-dir to refresh dashboard_data.json/.js cleanly.",
          "createdAt": "2026-11-25"
        },
        {
          "id": "OPS-039",
          "priority": "P4",
          "size": "M",
          "status": "backlog",
          "title": "Add visual velocity & model-tiering trend chart driven by sanitized runs.jsonl telemetry",
          "acceptanceCriteria": "Display cycle trend and Flash/Lite ratio history without exposing private domain run summaries.",
          "createdAt": "2026-11-25"
        },
        {
          "id": "OPS-040",
          "priority": "P5",
          "size": "S",
          "status": "backlog",
          "title": "Audit OpenGraph social preview cards and JSON-LD structured metadata across calebli.com subpages",
          "acceptanceCriteria": "Verify canonical URLs and OG metadata tags across root, bay-area-property-tax/, and executive-ops/.",
          "createdAt": "2026-11-25"
        }
      ]
    },
    {
      "id": "civic-tools",
      "name": "Civic Analytics & R&D Side Projects",
      "domain": "calebli.com/bay-area-property-tax",
      "url": "https://calebli.com/bay-area-property-tax",
      "kind": "git",
      "manager": "mgr-civic-tools",
      "stack": "Static HTML/Tailwind, Leaflet, Chart.js, Python Census ACS/ZBP pipelines, R&D micro-repos",
      "deploy": "GitHub Pages / OpenPHRorg/Personal-Website",
      "driveStatus": "ok",
      "health": "clean",
      "branch": "main",
      "dirtyFiles": 0,
      "lastCommit": {
        "hash": "e78945c",
        "date": "2026-11-24",
        "subject": "Upgrade Bay Area Property Tax Tracker into Property Tax & Business Audit using C"
      },
      "counts": {
        "backlog": 6,
        "active": 0,
        "done": 0,
        "total": 6
      },
      "prioritySummary": {
        "P0": {
          "total": 1,
          "done": 0,
          "open": 1
        },
        "P1": {
          "total": 1,
          "done": 0,
          "open": 1
        },
        "P2": {
          "total": 1,
          "done": 0,
          "open": 1
        },
        "P3": {
          "total": 1,
          "done": 0,
          "open": 1
        },
        "P4": {
          "total": 1,
          "done": 0,
          "open": 1
        },
        "P5": {
          "total": 1,
          "done": 0,
          "open": 1
        }
      },
      "tasks": [
        {
          "id": "OPS-025",
          "priority": "P0",
          "size": "S",
          "status": "backlog",
          "title": "Maintain zero-regression integrity on live Bay Area Property Tax & Business Audit (verify_tracker.mjs: 267 ZCTAs, 9 counties)",
          "acceptanceCriteria": "node bay-area-property-tax/scripts/verify_tracker.mjs passes all assertions cleanly.",
          "createdAt": "2026-11-25"
        },
        {
          "id": "OPS-005",
          "priority": "P1",
          "size": "S",
          "status": "backlog",
          "title": "Verify Bay Area Property Tax & Business Audit harness and track next Census ACS 2025 / ZBP 2024 release",
          "acceptanceCriteria": "Confirm node bay-area-property-tax/scripts/verify_tracker.mjs passes (267 ZCTAs, 9 counties) and document next Census data refresh check.",
          "createdAt": "2026-11-24"
        },
        {
          "id": "OPS-026",
          "priority": "P2",
          "size": "S",
          "status": "backlog",
          "title": "Add GitHub Actions CI verification running verify_tracker.mjs on Personal-Website updates",
          "acceptanceCriteria": "GitHub Actions validates tracker dataset and inline scripts before Pages artifact upload.",
          "createdAt": "2026-11-25"
        },
        {
          "id": "OPS-027",
          "priority": "P3",
          "size": "S",
          "status": "backlog",
          "title": "Add downloadable CSV export for county-level business-to-tax leverage audit rankings",
          "acceptanceCriteria": "Users can export filtered ZCTA and county audit metrics with Census suppression preserved.",
          "createdAt": "2026-11-25"
        },
        {
          "id": "OPS-028",
          "priority": "P4",
          "size": "L",
          "status": "backlog",
          "title": "Extend ZIP-level municipal fiscal audit methodology to additional California metros",
          "acceptanceCriteria": "Validate ACS + ZBP pipeline portability across Southern California and Sacramento ZIPs.",
          "createdAt": "2026-11-25"
        },
        {
          "id": "OPS-029",
          "priority": "P5",
          "size": "S",
          "status": "backlog",
          "title": "Archive and catalog legacy R&D computer-vision and clustering prototypes",
          "acceptanceCriteria": "Document entrypoints and archival status for heart-rate-cv, clustering, and webscraper.",
          "createdAt": "2026-11-25"
        }
      ]
    },
    {
      "id": "vivid-vision-advisory",
      "name": "Vivid Vision Advisory",
      "domain": "Ophthalmic VR & Perimetry Advisory",
      "url": null,
      "kind": "workspace",
      "manager": "mgr-vivid-vision",
      "stack": "Strategic Commercialization, Biopharma Partnerships, Licensing & Competitive Positioning",
      "deploy": "Advisory Workspace (Confidential Docs Redacted from Public Exports)",
      "driveStatus": "ok",
      "health": "workspace",
      "branch": "workspace",
      "dirtyFiles": 0,
      "lastCommit": null,
      "counts": {
        "backlog": 6,
        "active": 0,
        "done": 0,
        "total": 6
      },
      "prioritySummary": {
        "P0": {
          "total": 1,
          "done": 0,
          "open": 1
        },
        "P1": {
          "total": 1,
          "done": 0,
          "open": 1
        },
        "P2": {
          "total": 1,
          "done": 0,
          "open": 1
        },
        "P3": {
          "total": 1,
          "done": 0,
          "open": 1
        },
        "P4": {
          "total": 1,
          "done": 0,
          "open": 1
        },
        "P5": {
          "total": 1,
          "done": 0,
          "open": 1
        }
      },
      "tasks": [
        {
          "id": "OPS-030",
          "priority": "P0",
          "size": "M",
          "status": "backlog",
          "title": "Finalize biopharma & clinical trials commercialization playbook for ophthalmic VR perimetry",
          "acceptanceCriteria": "Complete strategic trial-endpoint positioning and biopharma engagement framework in private advisory workspace.",
          "createdAt": "2026-11-25"
        },
        {
          "id": "OPS-031",
          "priority": "P1",
          "size": "M",
          "status": "backlog",
          "title": "Advance strategic partnership, distribution, and licensing readiness framework",
          "acceptanceCriteria": "Maintain structured partner evaluation criteria and licensing term-sheet checklists (confidential details redacted).",
          "createdAt": "2026-11-25"
        },
        {
          "id": "OPS-032",
          "priority": "P2",
          "size": "M",
          "status": "backlog",
          "title": "Refresh competitive landscape and market positioning matrix across ophthalmic diagnostics",
          "acceptanceCriteria": "Benchmark home-based VR perimetry workflows against legacy perimeter hardware and clinical adoption hurdles.",
          "createdAt": "2026-11-25"
        },
        {
          "id": "OPS-033",
          "priority": "P3",
          "size": "S",
          "status": "backlog",
          "title": "Standardize public clinical evidence and product information kit synthesis",
          "acceptanceCriteria": "Align external product information summaries with published clinical validation studies.",
          "createdAt": "2026-11-25"
        },
        {
          "id": "OPS-034",
          "priority": "P4",
          "size": "S",
          "status": "backlog",
          "title": "Refine investor narrative, target market sizing, and board materials cadence",
          "acceptanceCriteria": "Update TAM/SAM assumptions and key commercialization milestones inside advisory materials.",
          "createdAt": "2026-11-25"
        },
        {
          "id": "OPS-035",
          "priority": "P5",
          "size": "S",
          "status": "backlog",
          "title": "Build automated ophthalmic trials and regulatory monitoring digest for advisory check-ins",
          "acceptanceCriteria": "Track public ophthalmology perimetry clinical trial postings and FDA Digital Health guidance updates.",
          "createdAt": "2026-11-25"
        }
      ]
    }
  ]
};
