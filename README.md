<div align="center">

<img src="https://img.shields.io/badge/TEC.LOG-Simulateur%20WMS%20P%C3%A9dagogique-1e3a5f?style=for-the-badge&labelColor=1e3a5f&color=f59e0b" alt="TEC.LOG"/>

# Mini-WMS Concorde

### Pedagogical ERP/WMS Simulator — Collège de la Concorde, Montréal

[![Live Demo](https://img.shields.io/badge/Live%20Demo-tecslides--s5kvdsbv.manus.space-22c55e?style=flat-square&logo=vercel)](https://tecslides-s5kvdsbv.manus.space)
[![TypeScript](https://img.shields.io/badge/TypeScript-0%20errors-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-214%20passed-22c55e?style=flat-square&logo=vitest)](./server)
[![Lines of Code](https://img.shields.io/badge/Lines%20of%20Code-35%2C085-6366f1?style=flat-square)](.)
[![License](https://img.shields.io/badge/License-Educational%20Use-f59e0b?style=flat-square)](./LEGAL.md)

</div>

---

## Overview

**Mini-WMS Concorde** is a full-stack pedagogical simulator designed for the **TEC.LOG certification programme** at Collège de la Concorde (Montréal). It replicates the core transactional workflows of industrial Warehouse Management Systems (WMS) and ERP platforms — specifically SAP S/4HANA — in a structured, gamified learning environment.

Students progress through **5 modules** covering the complete logistics cycle: from purchase order creation and goods receipt, to inventory cycle counting, KPI analysis, and integrated crisis simulation. Each module combines a knowledge quiz, a step-by-step WMS simulation, and a compliance validation engine that mirrors real-world SAP transaction logic.

The system is fully **bilingual (French / English)**, supports both **Evaluation mode** (scored, penalised, compliance-gated) and **Demo mode** (free progression with pedagogical explanations), and provides teachers with a real-time monitoring dashboard, cohort management, and CSV export.

---

## Live Demo

> **URL:** [https://tecslides-s5kvdsbv.manus.space](https://tecslides-s5kvdsbv.manus.space)

| Role | Email | Password |
|------|-------|----------|
| Student | `student@concorde.ca` | `Student123!` |
| Teacher / Admin | `gibranlog@gmail.com` | *(contact maintainer)* |

---

## Programme Structure — TEC.LOG (30 hours)

| Module | Title | SAP Transactions | Steps | Duration |
|--------|-------|-----------------|-------|----------|
| **M1** | Fondements ERP/WMS — Cycle logistique de base | ME21N · MIGO · LT0A · VL01N · PGI · MI01/MI04 | 9 | 6h |
| **M2** | Execution d'entrepot — Rangement structure & FIFO | MIGO · LT0A · VL01N (FIFO) · Compliance | 5 | 6h |
| **M3** | Controle des stocks — Inventaire cyclique & reappro | MI01 · MI04 · MI07 · MB52 · MRP | 5 | 6h |
| **M4** | Indicateurs de performance logistique — KPI & analyse | OTIF · Fill Rate · DSI · LPH · Lean | 5 | 6h |
| **M5** | Simulation integree — Cycle operationnel complet | Full cycle + crisis management | 7 | 6h |

Each module is gated by a **quiz (60% minimum to unlock simulation)** and concludes with a **compliance check** that validates the student's transactional state against system rules before the run is marked complete.

---

## Key Features

### Student Interface

The student experience is built around progressive discovery. Each module begins with a bilingual knowledge quiz that must be passed at 60% before the simulation unlocks. Once inside the simulation, students interact with SAP Fiori-inspired transaction forms that enforce real-world rules: zone validation (RECEPTION / STOCKAGE / EXPEDITION), step sequencing, FIFO compliance, and bin assignment logic.

After every completed step, a **pedagogical panel** opens automatically to explain why the action matters, its real SAP equivalent transaction, the most common student errors, and the dependency chain. A **glossary of 80 TEC.LOG terms** is accessible at any point during the simulation. At the end of each run, a **detailed Run Report** shows per-step scores, penalty analysis, and personalised improvement recommendations.

Additional features include a **password recovery flow** (forgot password / reset via secure expiring token) and a persistent dark/light mode toggle.

### Teacher Interface

The teacher dashboard provides full visibility into all student activity. Key capabilities include:

- **Real-time monitoring** — active simulations, live progress, scores per student
- **Cohort management** — create groups, assign students, track collective performance
- **Scenario manager** — 68 scenarios across 5 modules, configurable difficulty
- **Assignment manager** — assign specific scenarios to cohorts with deadlines
- **Student management** — create accounts, reset passwords, activate/deactivate, add notes
- **Analytics** — module-level KPIs, score distributions, completion rates
- **CSV export** — full results export for grade reporting

### Simulation Engine

The core simulation engine is built around three interconnected systems. The **rules engine** (`rulesEngine.ts`) enforces step sequencing, zone validation, and FIFO compliance — returning bilingual error messages via `pickReason()` which reads the `Accept-Language` header. The **scoring engine** computes automatic scores with perfect-cycle bonuses, penalty deductions, and a compliance multiplier. The **compliance engine** validates positive stock levels, posted transactions, and resolved inventory variances before allowing a run to be marked complete.

---

## Architecture

```
+----------------------------------------------------------+
|                     CLIENT (React 19)                    |
|  FioriShell · StudentPages · TeacherPages · AdminPanel   |
|  34 pages · 60 components · Tailwind 4 · shadcn/ui       |
+---------------------+------------------------------------+
                      | tRPC 11 (type-safe RPC)
                      | Accept-Language header (FR/EN)
+---------------------v------------------------------------+
|                   SERVER (Express 4)                     |
|  routers.ts · rulesEngine.ts · db.ts · seed.ts           |
|  pickReason() · calculateProgressPctAllModules()         |
+---------------------+------------------------------------+
                      | Drizzle ORM
+---------------------v------------------------------------+
|               DATABASE (MySQL / TiDB)                    |
|  13 tables: users · modules · scenarios · runs ·         |
|  transactions · cycleCounts · inventoryCounts ·          |
|  quizQuestions · quizAttempts · cohorts · assignments    |
+----------------------------------------------------------+
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React | 19 |
| Styling | Tailwind CSS + shadcn/ui | 4 |
| RPC Layer | tRPC | 11 |
| Backend | Express | 4 |
| ORM | Drizzle | 0.44 |
| Database | MySQL / TiDB | — |
| Auth | JWT (session cookie) + bcrypt | — |
| Language | TypeScript | 5.9 |
| Tests | Vitest | — |
| Runtime | Node.js | 22 |
| Package Manager | pnpm | 9 |

---

## Project Stats

| Metric | Value |
|--------|-------|
| TypeScript files | 143 |
| Lines of code | 35,085 |
| Pages | 34 |
| Components | 60 |
| Test files | 6 |
| Tests | **214 / 214 passing** |
| TypeScript errors | **0** |
| Scenarios | 68 (across 5 modules) |
| Quiz questions | 21 (bilingual FR/EN) |
| Bilingual strings | 800+ (all UI + all error messages) |

---

## Getting Started

### Prerequisites

- Node.js >= 22
- pnpm >= 9
- MySQL or TiDB (local or cloud)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Gibran-T/erp-simulator.git
cd erp-simulator

# 2. Install dependencies
pnpm install

# 3. Configure environment variables
# Copy the example file and fill in your values
# (see Environment Variables section below)

# 4. Push the database schema
pnpm db:push

# 5. Seed the database (modules, scenarios, quizzes)
npx tsx server/seed.ts

# 6. Start the development server
pnpm dev
```

The application will be available at `http://localhost:3000`.

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server (Express + Vite HMR) |
| `pnpm build` | Production build (Vite + esbuild) |
| `pnpm test` | Run full Vitest test suite (214 tests) |
| `pnpm db:push` | Generate and apply Drizzle migrations |
| `pnpm format` | Format code with Prettier |

---

## Environment Variables

The following environment variables are required:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | MySQL/TiDB connection string | Yes |
| `JWT_SECRET` | Session cookie signing secret (min. 32 chars) | Yes |
| `VITE_APP_ID` | OAuth application ID | Yes |
| `OAUTH_SERVER_URL` | OAuth backend base URL | Yes |
| `VITE_OAUTH_PORTAL_URL` | OAuth login portal URL (frontend) | Yes |
| `BUILT_IN_FORGE_API_KEY` | Server-side API key | Yes |
| `VITE_FRONTEND_FORGE_API_KEY` | Frontend API key | Yes |
| `BUILT_IN_FORGE_API_URL` | API base URL (server) | Yes |
| `VITE_FRONTEND_FORGE_API_URL` | API base URL (frontend) | Yes |

**Security:** Never expose `BUILT_IN_FORGE_API_KEY` to the client. Never commit `.env` files to version control.

---

## Test Coverage

```bash
pnpm test
```

| Test File | Coverage Area | Tests |
|-----------|--------------|-------|
| `server/wms.test.ts` | Rules engine, scoring, compliance | 15 |
| `server/demo.mode.test.ts` | Demo mode isolation | 15 |
| `server/module2.rules.test.ts` | M2 FIFO + putaway rules | 19 |
| `server/module3.rules.test.ts` | M3 ROP, EOQ, variance, replenishment | 73 |
| `server/module4.rules.test.ts` | M4 KPI calculations | 51 |
| `server/module5.rules.test.ts` | M5 NLP decision scoring | 40 |
| `server/auth.logout.test.ts` | Auth / logout | 1 |
| **Total** | | **214 / 214 passed** |

---

## Project Structure

```
concorde-slides/
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── student/        <- ScenarioList, MissionControl, StepForm,
│   │   │   │                      RunReport, QuizPage, GlossaryPage
│   │   │   ├── teacher/        <- TeacherDashboard, CohortManager,
│   │   │   │                      ScenarioManager, AssignmentManager,
│   │   │   │                      MonitorDashboard, StudentManagement
│   │   │   └── admin/          <- AdminPanel
│   │   ├── components/
│   │   │   ├── FioriShell.tsx  <- Global layout (header + institutional footer)
│   │   │   ├── StepForm.tsx    <- Transaction forms (all 5 modules)
│   │   │   └── ui/             <- shadcn/ui components (60 total)
│   │   ├── contexts/
│   │   │   ├── LanguageContext.tsx  <- FR/EN toggle (t() helper)
│   │   │   └── ThemeContext.tsx     <- Dark/light mode
│   │   └── data/
│   │       └── modules.ts      <- Module metadata + slide content
├── drizzle/
│   └── schema.ts               <- 13 database tables + relations
├── server/
│   ├── routers.ts              <- All tRPC procedures (~2,000 lines)
│   ├── rulesEngine.ts          <- Step validation + compliance engine
│   ├── db.ts                   <- Drizzle query helpers
│   ├── seed.ts                 <- Module/scenario/quiz seeding
│   └── *.test.ts               <- 6 test files (214 tests)
└── shared/
    └── const.ts                <- Shared constants
```

---

## Bilingual Support

The system is fully bilingual (French / English) at every layer. Language is toggled via the FR / EN button in the top navigation bar. The selection is persisted in `localStorage` and automatically sent to the server on every API call via the `Accept-Language` header.

| Layer | Implementation |
|-------|---------------|
| UI strings | All pages use `useLanguage()` + `t(frText, enText)` helper |
| Error messages | `pickReason(validation, req)` reads `Accept-Language` header |
| Scenario descriptions | `descriptionFr` / `descriptionEn` columns in database |
| Quiz content | `questionFr/En`, `optionsFr/En`, `explanationFr/En` in database |
| Pedagogical panels | `whyFr/En`, `realSAPFr/En`, `dependencyFr/En`, `realErrorFr/En` in StepForm config |
| Glossary | 80 terms with FR/EN definitions |

---

## Deployment

### Manus Platform (Recommended)

This project is optimised for the Manus platform. After creating a checkpoint, click **Publish** in the Manus Management UI. The live instance is available at [https://tecslides-s5kvdsbv.manus.space](https://tecslides-s5kvdsbv.manus.space).

### External Hosting (Railway, Render)

This project uses a persistent Express server and a MySQL database. It is **not compatible with Vercel** without significant refactoring. For external hosting, connect the GitHub repository to Railway or Render, add all environment variables in the hosting dashboard, and use `pnpm build` as the build command and `node dist/index.js` as the start command.

---

## Security

The application follows standard security practices throughout. Server-side API keys are never exposed to the client. Sessions are signed with JWT and transmitted via `HttpOnly` cookie. All protected procedures verify authentication on every request. Admin operations are protected by role check. Passwords are hashed with bcrypt (10 rounds). Password reset tokens are single-use and expire after 1 hour.

---

## Roadmap

- [ ] `nameEn` field for scenario names (currently French-only)
- [ ] Inventory isolation per run (scope all stock calculations by `runId`)
- [ ] Controlled dropdowns in StepForm (retain selected values on re-render)
- [ ] Persistent compliance banner (hide when `compliance.compliant === true`)
- [ ] Email notifications for assignment deadlines
- [ ] Mobile-responsive StepForm layout

---

## Contributing

This project is developed for educational use at Collège de la Concorde. For contributions or institutional partnerships, open an issue in the repository.

---

## Legal

Educational use only — Collège de la Concorde, Montreal.
Copyright 2026 College de la Concorde. All rights reserved.
See [/legal](/legal) for full legal notices.

---

<div align="center">

**Built with care for logistics education**

*College de la Concorde — Programme TEC.LOG — Montreal, Quebec*

</div>
