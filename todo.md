# Mini-WMS Concorde — Simulateur ERP/WMS TODO

## Phase 1: Setup & Schema
- [x] Write todo.md
- [x] Extend Drizzle schema with all WMS tables (13 tables)
- [x] Configure SAP Fiori theme (CSS variables, fonts, badges)
- [x] Setup auth routing (student/teacher/admin roles)
- [x] Push DB migrations

## Phase 2: Backend (tRPC Routers)
- [x] Rules engine (Module 1 flow + compliance + dependency blocking)
- [x] Scoring engine (points + penalties + perfect run bonus)
- [x] Inventory calculation (SUMPRODUCT per SKU/BIN from transactions)
- [x] Router: master (skus, bins)
- [x] Router: scenarios (list, create)
- [x] Router: cohorts (list, create)
- [x] Router: assignments (create, all)
- [x] Router: runs (start, state, myRuns)
- [x] Router: transactions (PO, GR, SO, GI, ADJ)
- [x] Router: cycleCounts (submit, resolve)
- [x] Router: compliance (check, finalize)
- [x] Router: scoring (events)
- [x] Router: monitor (allRuns)
- [x] Seed data: 10 SKUs, 13 bins, 5 Module 1 scenarios

## Phase 3: Student UI
- [x] Home landing page with role-based redirect
- [x] FioriShell layout component (SAP Fiori style)
- [x] /student/scenarios — assigned scenarios list
- [x] /student/run/:runId — MISSION_CONTROL dashboard (progress, compliance, next step)
- [x] /student/run/:runId/:step — StepForm (PO/GR/SO/GI/CC/ADJ/Compliance)
- [x] /student/run/:runId/report — Final Report with pedagogical summary

## Phase 4: Teacher UI
- [x] /teacher — TeacherDashboard (KPI cards + recent activity)
- [x] /teacher/cohorts — CohortManager
- [x] /teacher/scenarios — ScenarioManager (create + assign)
- [x] /teacher/assignments — AssignmentManager
- [x] /teacher/monitor — MonitorDashboard with CSV export

## Phase 5: Final
- [x] Vitest tests (16 tests passing — rules engine + scoring + auth)
- [x] AdminPanel
- [ ] README with setup instructions
- [x] Checkpoint and deliver

## Phase 6: Mode Démonstration
- [x] Extend scenario_runs table: add `isDemo` boolean column
- [x] Push DB migration (pnpm db:push)
- [x] Update `runs.start` router: accept `isDemo` param, store in DB
- [x] Update all transaction routers: skip scoring/penalties when run.isDemo=true
- [x] Update `monitor.allRuns`: exclude demo sessions from analytics
- [x] Build ModeSelectionScreen component (pre-Mission Control)
- [x] Role gate: only teacher can select demo mode
- [x] Add demo banner to student pages
- [x] Unlock step blocking in demo mode (warn but allow)
- [x] Add pedagogical explanation panels to PO, GR, SO, GI, CC, ADJ pages
- [x] Add backend transparency panel (stock, pending txs, dependencies)
- [x] Write/update Vitest tests for demo mode isolation (15 tests)

## Module 2: Advanced Warehouse Execution

- [ ] Add `bin_capacity` table to drizzle/schema.ts
- [ ] Add `unlockedByModuleId` field to modules table
- [ ] Push DB migration (pnpm db:push)
- [ ] Extend rulesEngine.ts: putaway validation (bin exists, capacity, FIFO)
- [ ] Add scoring penalties: -10 capacity overflow, -15 FIFO violation
- [ ] Add module unlock check in backend (Module 2 requires Module 1 passed)
- [ ] Add putaway router (warehouse.putaway)
- [ ] Update seed.ts: Module 2 entry + 3 Module 2 scenarios + bin capacities
- [ ] Build PutawayStep.tsx UI component
- [ ] Update ScenarioList to show module grouping and lock state
- [ ] Extend TeacherDashboard: per-module stats
- [ ] Write server/module2.rules.test.ts
- [ ] Run pnpm test — all pass

## UX Fixes
- [ ] Fix assignment dropdown: support cohort OR individual student
- [ ] Add backend router: teacher.listStudents
- [ ] Add collapsible arrow sections to ScenarioList, Module2ScenarioList, MissionControl, StepForm

## Module 3: Contrôle des stocks & réapprovisionnement

- [ ] DB: inventory_counts, inventory_adjustments, replenishment_params, replenishment_suggestions tables
- [ ] DB: teacherValidated + teacherValidatedAt in module_progress
- [ ] DB: push migration
- [ ] rulesEngine: variance, threshold, adjustment, replenishment rules
- [ ] scoringEngine: Module 3 penalties/bonuses, pass threshold 70
- [ ] db.ts: Module 3 helpers
- [ ] routers.ts: m3 student + teacher procedures
- [ ] seed.ts: Module 3 + replenishment_params + 3 scenarios
- [ ] UI: Module 3 hub card with hybrid lock gate
- [ ] UI: CycleCountList, CountEntryForm, VarianceReview, ReplenishmentSuggestions, ComplianceSummary pages
- [ ] Teacher: Module 3 section + variance view + validate button
- [ ] Tests: module3.rules, module3.scoring, moduleGate.module3
- [ ] Run pnpm test — all pass

## Feature: Scores détaillés et résumé d'erreurs (RunReport enrichi)

- [ ] Backend : créer `runs.detailedReport` avec scores par étape + liste d'erreurs pédagogiques
- [ ] Backend : mapper les scoring events par étape (PO, GR, STOCK, SO, GI, CC, COMPLIANCE)
- [ ] Frontend RunReport : tableau de scores détaillé par étape (points obtenus / points max)
- [ ] Frontend RunReport : section "Résumé des erreurs" avec description pédagogique
- [ ] Frontend RunReport : section "Recommandations" basée sur les erreurs commises
- [ ] Frontend RunReport : graphique barre de progression par étape (Chart.js)
- [ ] Tests unitaires pour les nouvelles fonctions backend

## Feature: Scoring visible en mode démonstration

- [x] Backend : activer les scoring events en mode démo (retirer le guard `if (!run.isDemo)`)
- [x] Backend : scoring démo calculé via isDemo flag sur le run (pas besoin de flag sur chaque event)
- [x] Backend : `runs.state` retourne le score démo (non zéro) avec label "DÉMO"
- [x] Backend : `monitor.allRuns` continue d'exclure les scores démo des statistiques officielles
- [x] Frontend MissionControl : afficher le score démo avec badge "Score Pédagogique (non officiel)"
- [x] Frontend MissionControl : score mis à jour en temps réel après chaque étape (via query refetch)
- [x] Frontend RunReport : afficher le score démo avec mention "Score non comptabilisé"

## Bug Fix: SKU Validation + Context Panel
- [ ] Fix: SKU field must be required — form must NOT submit when SKU is empty string
- [ ] Fix: Backend must reject transactions with empty sku field (zod validation)
- [ ] Feature: Add context panel in StepForm showing SKU/Bin/Qty from previous steps

## Feature: Admin Reset de Sessão
- [ ] Backend: runs.resetRun procedure (admin only) — anula run, deleta transactions/cycleCounts/scoringEvents
- [ ] Frontend MonitorDashboard: botão "Reinicializar" por linha de estudante com confirmação
- [ ] Fix: SKU obrigatório no StepForm — bloquear submit se sku === ""
- [ ] Fix: Backend zod validation — rejeitar sku vazio nas transactions
- [ ] Feature: Painel de contexto no StepForm mostrando SKU/Bin/Qty das etapas anteriores

## Bug Fix: Acesso Admin aos Módulos + Sidebar Recolhível
- [x] Admin/professor tem acesso livre a todos os módulos sem bloqueio de pré-requisitos
- [x] Adicionar botão de recolhimento da navegação + menu mobile hamburger no FioriShell

## Feature: Acesso Direto ao Simulador para Professor
- [x] Adicionar link "Simulateur" na barra de navegação do professor (TeacherShell/nav)
- [x] Adicionar card "Simulateur" no dashboard do professor com acesso direto
- [x] Criar página /teacher/simulator que redireciona para /student/scenarios com banner "Vue Enseignant"

## Integrações Novas (2026-03-15)
- [x] FR/EN toggle global no FioriShell (muda toda a interface)
- [x] Dark Mode toggle no FioriShell (opção do aluno)
- [x] Botão Slides M1 no ScenarioList
- [x] Botão Slides M2 no Module2ScenarioList
- [x] Botão Slides M3 no Module3ScenarioList
- [x] Botão Slides M4 no Module4Dashboard
- [x] Botão Slides M5 no Module5SimulationPage
- [x] SlideViewer com guard de login + modo professor/aluno
- [x] 5 módulos × ~17 slides bilingues (FR/EN) integrados
- [x] Seed completo: 5 módulos, 39 cenários, 10 SKUs, 13 bins

## Bug Fixes (2026-03-15 — Teste de Funcionalidade)
- [x] Fix: SlideViewer — hooks chamados após early return condicional (React hooks rule violation)
- [x] Fix: Banco de dados — tabela cycle_counts com colunas desatualizadas (bin, physicalQty, variance, resolved)
- [x] Fix: Banco de dados — tabela profiles com coluna desatualizada (studentNumber)
- [x] Fix: Banco de dados — tabela progress reestruturada (runId, stepCode, completed, completedAt)

## Feature: Hub de Slides para o Professor
- [x] Criar página /teacher/slides — hub com acesso a todos os 5 módulos de slides
- [x] Registrar rota /teacher/slides no App.tsx
- [x] Adicionar botões "Slides M1-M5" nos cards de módulo do TeacherDashboard
- [x] Verificar que o link "Slides" no FioriShell aponta para /teacher/slides

## Feature: Hub de Slides para Alunos
- [x] Corrigir /teacher/slides (página em branco — problema de carregamento)
- [x] Criar página /student/slides — hub de slides para alunos com acesso a todos os 5 módulos
- [x] Registrar rota /student/slides no App.tsx
- [x] Adicionar botão "Slides" na interface do aluno (FioriShell nav + ScenarioList)

## Bug Fix: FR/EN Toggle + Dark Mode Global (2026-03-15)
- [ ] Fix: LanguageContext — toggle FR/EN deve mudar TODOS os textos da interface (professor e aluno)
- [ ] Fix: Todos os componentes devem usar `useLang()` / `t()` para textos traduzíveis
- [ ] Fix: ThemeContext — dark mode deve funcionar em ambos os ambientes (professor e aluno)
- [ ] Fix: Cenários duplicados na lista do professor (ScenarioManager)

## QA Sênior — Diagnóstico e Correções (2026-03-15)
- [ ] Fix: FR/EN toggle não muda textos da interface do professor (TeacherDashboard, ScenarioManager, etc.)
- [ ] Fix: FR/EN toggle não muda textos da interface do aluno (ScenarioList, MissionControl, StepForm, etc.)
- [ ] Fix: Dark mode não aplica corretamente em ambos os ambientes
- [ ] Fix: Cenários duplicados na lista do professor (ScenarioManager)
- [ ] Auditoria completa: mapear todos os componentes que NÃO usam t() para tradução

## QA Global: Dark Mode + FR/EN em Todo o Sistema (2026-03-15)

- [x] TeacherDashboard — dark mode (bg-card, text-foreground, border-border)
- [x] ScenarioManager — dark mode
- [x] Cenários duplicados removidos do banco (11 duplicatas)
- [ ] MissionControl — dark mode + FR/EN
- [ ] StepForm — dark mode + FR/EN
- [ ] RunReport — dark mode + FR/EN
- [ ] MonitorDashboard — dark mode + FR/EN
- [ ] ScenarioList (aluno) — dark mode + FR/EN completo
- [ ] index.css — adicionar variáveis Fiori para dark mode (.dark block)
- [ ] Testar dark mode em todas as páginas
- [ ] Testar FR/EN em todas as páginas

## Feature: Gerenciamento de Usuários no AdminPanel
- [ ] Backend: admin.listAllUsers — listar todos os usuários com id, nome, email, role, lastSignedIn
- [ ] Backend: admin.changeUserRole — promover/rebaixar role (já existe, verificar)
- [ ] Frontend AdminPanel: tabela de usuários com botões de promoção/rebaixamento de role
- [ ] Frontend AdminPanel: badge colorido por role (admin=vermelho, teacher=azul, student=verde)
- [ ] Frontend AdminPanel: confirmação antes de mudar role
- [ ] Testar: Nadia faz login → aparece como student → admin promove para teacher

## Student Scenarios Page — Redesign & Consistency (2026-03-15)
- [x] Student Scenarios: corrigir inconsistência M1 vs M2-M5 (todos os módulos devem ter o mesmo layout)
- [x] Student Scenarios: redesenho visual — mais agradável, pedagógico e claro para o aluno
- [x] Student Scenarios: adicionar glossário de acrônimos (PO, GR, SO, GI, CC, COMPLIANCE)
- [x] Student Scenarios: mostrar progresso (X/Y étapes) e barra de progresso nos cards "En cours"
- [x] Student Scenarios: mostrar estado "Complété" com score e opção de reiniciar
- [x] Student Scenarios: mostrar duração estimada e critério de aprovação (≥60%) por cenário
- [x] Student Scenarios: seletor de módulo visível para navegar entre M1-M5

## Bug Fix: FioriShell JSX Structure (2026-03-15)
- [x] Fix: FioriShell.tsx — mobile menu conditional `{mobileMenuOpen && (` missing closing `)}` before Page Header section (line 379). Page Header, main content, and footer were all nested inside the mobile menu conditional, causing rendering issues on desktop.
