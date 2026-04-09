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
- [x] /student/run/:runId/:step — StepForm (PO/GR/SO/GI/CC/ADJ/Compliance + M2/M3/M4/M5 all steps)
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

## Bug Fix: Language Toggle na Página de Login (2026-03-15)
- [ ] Fix: Home.tsx — dropdown de língua não está conectado ao LanguageContext global (não muda textos)
- [ ] Fix: Todos os textos da Home.tsx devem usar t() para FR/EN

## Bug Fix: FR/EN Toggle Global — Auditoria Completa (2026-03-15 — Sessão 2)
- [x] Fix: TeacherDashboard — todos os textos traduzidos com t()
- [x] Fix: FioriShell — nav items já usavam t() (já estava correto)
- [x] Fix: CohortManager — textos traduzidos com t()
- [x] Fix: AssignmentManager — textos traduzidos com t()
- [x] Fix: ScenarioManager — textos traduzidos com t()
- [ ] Fix: ModeSelectionScreen — pendente
- [ ] Fix: Module2ModeSelectionPage — pendente
- [ ] Fix: Module3ModeSelectionPage — pendente
- [ ] Fix: PutawayForm — pendente
- [ ] Fix: PutawayFormPage — pendente

## Feature: Warehouse Zone Logic + PUTAWAY/PICKING Steps (2026-03-15 — Phase 1+2)
- [ ] rulesEngine: add PUTAWAY step (REC → STOCKAGE) and PICKING step (STOCKAGE → EXPEDITION) to MODULE1_STEPS (9 steps total)
- [ ] rulesEngine: zone validation — GR must use RECEPTION bin, PUTAWAY moves from RECEPTION to STOCKAGE, PICKING moves from STOCKAGE to EXPEDITION, GI must use EXPEDITION bin
- [ ] rulesEngine: update canExecuteStep for new 9-step sequence
- [ ] routers: add submitPUTAWAY procedure with zone validation and scoring
- [ ] routers: add submitPICKING procedure with zone validation and scoring
- [ ] routers: update scoring step breakdown to include PUTAWAY and PICKING
- [ ] routers: add detailed per-field error tracking (which field was wrong, expected vs actual)
- [ ] StepForm: filter bins by zone per step (GR→RECEPTION, PUTAWAY from/to, PICKING from/to, GI→EXPEDITION, CC→all)
- [ ] StepForm: add PUTAWAY form config (fromBin RECEPTION, toBin STOCKAGE)
- [ ] StepForm: add PICKING form config (fromBin STOCKAGE, toBin EXPEDITION)
- [ ] MissionControl: show 9 steps in progress tracker
- [ ] RunReport: show detailed per-field error feedback per step
- [ ] RunReport: show zone movement diagram (REC→STOCK→EXP)

## Feature: Dashboard Power BI — Analytics Avancé (2026-03-15)
- [ ] Backend: monitor.powerAnalytics — agregação completa: KPIs, scores por etapa, heatmap de erros, ranking de alunos, dados por coorte, tendências temporais
- [ ] Frontend: /teacher/analytics — página de dashboard Power BI com Recharts
- [ ] Dashboard: KPI cards (total alunos, score médio, taxa de conclusão, taxa de conformidade)
- [ ] Dashboard: Gráfico de barras — Score médio por aluno (ranking)
- [ ] Dashboard: Gráfico de barras empilhadas — Erros por etapa (PO/GR/PUTAWAY/SO/PICKING/GI/CC)
- [ ] Dashboard: Gráfico de linha — Evolução do score médio ao longo do tempo
- [ ] Dashboard: Heatmap — Taxa de erro por etapa × aluno
- [ ] Dashboard: Gráfico radar — Perfil de desempenho da turma por etapa
- [ ] Dashboard: Tabela de ranking de alunos com score, progresso, status
- [ ] Dashboard: Filtros dinâmicos por módulo, coorte, modo (eval/demo)
- [ ] Dashboard: Painel de análise pedagógica inteligente com recomendações
- [ ] Registrar rota /teacher/analytics no App.tsx
- [ ] Adicionar link "Analytics" no FioriShell para professores

## Feature: Dashboard Power BI Analytics (2026-03-15)
- [x] Backend: tRPC `monitor.powerAnalytics` — agregação completa (KPIs, ranking, heatmap, erros, timeline)
- [x] Frontend: página `/teacher/analytics` estilo Power BI com Recharts
- [x] KPI cards: estudantes, score médio, taxa de aprovação, conformidade, complétion, progresso, sessões
- [x] Gráfico: ranking de alunos (melhor score vs score médio)
- [x] Gráfico: distribuição de scores (donut chart)
- [x] Gráfico: taxa de complétion por etapa M1 (barras horizontais coloridas)
- [x] Gráfico: frequência de erros pedagógicos (barras horizontais)
- [x] Gráfico: evolução do score médio no tempo (area chart)
- [x] Gráfico: perfil de maestria por etapa (radar chart)
- [x] Gráfico: atividade por módulo (barras empilhadas)
- [x] Tabela: classamento detalhado com medalhas 🥇🥈🥉
- [x] Heatmap: complétion por aluno × etapa (matriz colorida)
- [x] FR/EN bilíngue COMPLETO — todos os textos via t() conectados ao toggle global FR/EN
- [x] Nav item "Analytics" adicionado ao FioriShell (sidebar do professor)
- [x] Rota `/teacher/analytics` registrada no App.tsx
- [x] Auto-refresh a cada 60 segundos + botão "Actualiser / Refresh"

## Feature: Score Evolution Line Chart (2026-03-16)
- [x] Backend: `monitor.studentScoreEvolution` — retorna tentativas ordenadas por data para um aluno + cenário
- [x] Frontend: seção "Évolution du score" no AnalyticsDashboard com seletor de aluno + seletor de cenário
- [x] Gráfico de linha: eixo X = tentativas (1ª, 2ª, 3ª…), eixo Y = score (0-100), linha por aluno selecionado
- [x] Mostrar linha de aprovação (60 pts) como referência horizontal
- [x] Tooltip com data, score, penalidades e status (Réussi/Échoué)
- [x] FR/EN bilíngue via t()

## Feature: Student Score Evolution View (2026-03-16)
- [x] Backend: `runs.myScoreEvolution` — retorna todas as tentativas do aluno logado para um cenário específico (score, penalidades, data, status)
- [x] Frontend: seção "Mon évolution" na página RunReport — gráfico de linha mostrando score por tentativa
- [x] Mostrar linha de aprovação (60 pts) como referência horizontal
- [x] Tooltip com data, score, penalidades e status por tentativa
- [x] Ponto atual destacado em amarelo no gráfico do aluno
- [x] FR/EN bilíngue via t()
- [ ] Push to GitHub after all features complete

## Bug: FioriShell nav bar overflow
- [x] Fix nav items cramped/overlapping on medium screens — icons only on md, icons+labels on lg+, overflow-x scroll with hidden scrollbar
- [x] Fix Analytics page not opening — session expiry issue (login required after sandbox reset); nav fix applied

## Feature: Email/Password Authentication for Students
- [ ] Add email + password login option (no Manus account required)
- [ ] Teacher can create student accounts from admin panel
- [ ] Student receives credentials by email or from teacher
- [ ] Both Manus OAuth and email/password work simultaneously

## Feature: 30-Hour Content Gap Analysis & Additions
- [ ] Audit current content hours per module (real vs declared)
- [ ] Identify missing content to reach 30h with quality
- [ ] Add quiz/QCM activities per module (10-15 min each)
- [ ] Add case study readings per module
- [ ] Add glossary/reference sheets per module
- [ ] Produce content gap analysis PDF for professor

## Feature: Visual Quality Upgrade (SAP Fiori / Odoo Level)
- [ ] Upgrade StepForm to SAP Fiori-inspired transaction panel
- [ ] Improve MissionControl layout with professional WMS dashboard feel
- [ ] Add color-coded status indicators (green/amber/red) like real WMS
- [ ] Improve RunReport with professional score card design
- [ ] Upgrade student ScenarioList to look like Odoo module selection

## Audit: Teacher Environment Functional Review
- [ ] Test all 8 teacher nav items and document what works/broken
- [ ] Verify cohort creation and student assignment flow
- [ ] Verify scenario assignment to cohort flow
- [ ] Verify monitoring real-time view
- [ ] Verify analytics charts with real data
- [ ] Document missing teacher features

## Audit: Student Environment Functional Review
- [ ] Test complete scenario flow as student (all 7 steps)
- [ ] Verify step validation feedback
- [ ] Verify score report after completion
- [ ] Verify score evolution chart
- [ ] Document missing student features

## Bug Fixes & Improvements (Audit 2026-03-23)
- [ ] Fix Module 19/24 bug in ScenarioManager — M4/M5 show wrong IDs because seed ran multiple times; fix by mapping module code to label
- [ ] Add /student redirect to /student/scenarios (currently 404)
- [ ] Add student onboarding/welcome page before first scenario
- [ ] Fix teacher Assignments page — verify full functionality
- [ ] Add cohort quick-create from teacher dashboard

## Feature: Teacher-Managed Student Accounts (2026-03-24)
- [x] DB: isActive + notes columns added to users table (migration 0010 applied)
- [x] Backend: auth.localLogin — email/password login (bcrypt, JWT session)
- [x] Backend: auth.localRegister — student self-registration with optional access code
- [x] Backend: auth.createAccount — teacher/admin creates student/teacher accounts
- [x] Backend: auth.resetPassword — admin resets any user's password
- [x] Backend: auth guard blocks isActive=false users from logging in
- [x] Backend: students.list — teacher lists all students (with cohort, lastSignedIn, isActive, score stats)
- [x] Backend: students.create — teacher creates student account (email, name, password, cohort)
- [x] Backend: students.setActive — teacher activates/deactivates (includes/excludes) student
- [x] Backend: students.updateNotes — teacher adds notes to student profile
- [x] Backend: students.resetPassword — teacher resets student password
- [x] Backend: students.assignCohort — teacher assigns student to cohort
- [x] Frontend: /teacher/students — Student Management page with full table
- [x] Frontend: Create Student dialog (name, email, password, cohort)
- [x] Frontend: Activate/Deactivate toggle per student (include/exclude)
- [x] Frontend: Reset Password dialog per student
- [x] Frontend: Notes field per student (inline edit)
- [x] Frontend: Assign to Cohort dropdown per student
- [x] Frontend: Search/filter by name, email, cohort, status
- [x] FioriShell: add "Étudiants" nav item for teacher
- [x] Seed test accounts: 4 students + 1 teacher + 1 admin

## Bug Fix: StepForm PUTAWAY_M1 / PICKING_M1 / STOCK (2026-03-23)
- [x] Add PUTAWAY_M1 config (LT0A, fromBin/toBin fields) to StepForm STEP_CONFIG
- [x] Add STOCK config (MB52, auto-validated info panel) to StepForm STEP_CONFIG
- [x] Add PICKING_M1 config (VL01N, fromBin/toBin fields) to StepForm STEP_CONFIG
- [x] Add submitPUTAWAY_M1 and submitPICKING_M1 mutations to StepForm
- [x] Add fromBin/toBin field rendering with zone hints (RÉCEPTION/STOCKAGE/EXPÉDITION)
- [x] Add PUTAWAY_M1, STOCK, PICKING_M1 to MissionControl STEPS array
- [x] Add PUTAWAY_M1, STOCK, PICKING_M1 to PEDAGOGICAL_OBJECTIVES in MissionControl
- [x] All 50 vitest tests pass, zero TypeScript errors

## QA Priority Fixes (2026-03-25)
- [x] Testes unitários M3: ROP, EOQ, calculateVariance, computeReplenishmentSuggestion (73 novos testes)
- [x] Testes unitários M4: calculateKpis (rotation, service, errorRate, DSI, stockValue)
- [x] Testes unitários M5: scoreM5Decision (NLP scoring, bonus, feedback)
- [x] RunReport: tabela de scores por etapa dinâmica M1-M5 (pontos obtidos / pontos máx)
- [x] RunReport: seção "Resumo de erros pedagógicos" com descrição e recomendação
- [x] RunReport: backend procedure runs.detailedReport expandido para M1-M5
- [x] FR/EN toggle: TeacherDashboard — todos os textos via t() (já estava correto)
- [x] FR/EN toggle: ScenarioManager — todos os textos via t() (já estava correto)
- [x] FR/EN toggle: MonitorDashboard — todos os textos via t() (já estava correto)
- [x] FR/EN toggle: AssignmentManager — todos os textos via t() (já estava correto)
- [x] FR/EN toggle: CohortManager — todos os textos via t() (já estava correto)
- [x] Experiência didática M3: painel ROP/EOQ com fórmulas visíveis + feedback de precisão no réapprovisionnement
- [x] Experiência didática M3: feedback CC_COUNT mostra variância total + orientação para CC_RECON
- [x] Experiência didática M3: feedback CC_RECON mostra número de ajustamentos aplicados
- [x] RunReport: competências dinâmicas por módulo (M1-M5 cada um com suas competências específicas)
- [x] Backend: submitCcRecon retorna adjustmentsApplied; submitReplenish retorna studentQty para feedback de precisão

## QA Senior Mission — 10 Steps (2026-03-25)

- [x] Step 1: Internal email+password auth — Manus OAuth removed from login page
- [x] Step 1: Create account gibranlog@gmail.com / 161878Log$ with admin role
- [x] Step 1: Login flow validated (localLogin + bcrypt + JWT session)
- [x] Step 2: Quiz system — 5 quizzes (M1: 5q, M2-M5: 4q each), 60% gate, explanations
- [x] Step 2: Quiz button added to StudentSlidesHub module cards; route /student/quiz/:moduleId
- [x] Step 3: ScenarioList fixed — M2-M5 now use unified run flow (ModeSelectionScreen)
- [x] Step 4: Persistent feedback panel in StepForm — pedagogicalDeep content shown post-submit
- [x] Step 5: MissionControl now uses dynamic steps from backend (M1-M5 all supported)
- [x] Step 5: runs.state uses getNextRequiredStepAllModules + calculateProgressPctAllModules
- [x] Step 8: 123/123 tests passing, TypeScript 0 errors, DB verified (5 quizzes, 21 questions)
- [x] Step 9: Final checkpoint + push to GitHub (158dde16)
- [x] Step 10: Final QA Senior report (verdict + action plan) — QA_Senior_Mission_Final_2026.pdf

## Sprint: 3 QA Priorities + Student Experience (2026-03-25)

- [x] Priority 1: Quiz gate — block simulation start if quiz not passed (≥60%)
- [x] Priority 1: Add quiz.getBestAttempt procedure to backend
- [x] Priority 1: Show quiz status badge on ScenarioList module cards
- [x] Priority 2: Glossary page /student/glossary with 80 TEC.LOG terms FR/EN
- [x] Priority 2: Add "Aide" button in StepForm linking to glossary
- [x] Priority 2: Add glossary link in FioriShell navigation
- [x] Priority 3: server/trpc.integration.test.ts — M1 full flow (PO→GR→PUTAWAY→SO→PICKING→GI→CC→COMPLIANCE)
- [x] Priority 3: server/trpc.integration.test.ts — M3 full flow (CC_LIST→CC_COUNT→CC_RECON→REPLENISH)
- [ ] Student experience run: create account, M1-M5 complete, honest journal
- [ ] Student journey report PDF

## Student Journey Simulation — Bugs Found & Fixed (2026-03-25)

- [x] Bug: Quiz options.map crash — optionsFr/optionsEn stored as JSON strings, not parsed arrays (fixed in QuizPage.tsx parseOpts helper + router JSON.parse)
- [x] Bug: Sonner toast not showing — sonner.tsx used next-themes useTheme (not installed), fixed to use custom ThemeContext
- [x] Bug: quiz.getBestAttempt returns undefined when no attempt — fixed to return null
- [x] Bug: PUTAWAY_M1 stock debit missing — GR posted +50 to REC-01 but PUTAWAY never debited REC-01, leaving phantom stock (fixed: PUTAWAY now records negative debit transaction for fromBin)
- [x] Bug: COMPLIANCE step gives no resolution path for unposted transactions — added actionable hints and "Retour au Mission Control" button
- [x] Feature: Quiz immediate feedback — added quiz.checkAnswer procedure + updated QuizPage to show correct/wrong with explanation after each answer (not just at results)

## UX Improvements Sprint (25 mars 2026)

- [x] Password recovery flow — "Mot de passe oublié" link on login + /forgot-password + /reset-password/:token + DB token table + requestPasswordReset + resetPasswordWithToken procedures
- [x] Student number onboarding — N° étudiant field in registration form (optional, auto-saved via profiles.upsert after register)
- [x] Bin zone hints in StepForm — binZoneHint config added to GR, PUTAWAY_M1, SO, PICKING_M1, GI, FIFO_PICK, M5_PUTAWAY; blue hint shown below each bin dropdown
- [x] Expert end-to-end validation run M1→M5 — PASS (3 bugs fixed: M2 GR routing, PUTAWAY_COMPLETED scoring rule, completeRun() missing in M2-M5 COMPLIANCE procedures)

## Final Polish & Stability Sprint (26 mars 2026)

- [ ] Fix 1: Inventory isolation per run — scope all stock/CC/compliance calculations by runId
- [ ] Fix 2: Password reset flow end-to-end — token validation, expiry, new password login
- [ ] Fix 3: Controlled dropdowns in StepForm — SKU, bin, fromBin, toBin retain selected values
- [ ] Fix 4: Persistent orange banner — hide when compliance.compliant === true
- [ ] Final clean validation M1→M5 (no hotfix mode)
- [ ] Final verdict report

## Feature: Full Bilingual System FR/EN (2026-03-29)
- [x] Seed: add descriptionEn to all 34 scenarios (M1-M5) — SQL UPDATE applied to all 68 rows
- [x] Schema: add descriptionEn column to scenarios table (drizzle schema + DB column added)
- [x] Routers: bilingualize all error messages — pickReason() helper + Accept-Language header wired
- [x] rulesEngine: add reasonEn to ValidationResult interface + all canExecuteStep/validateGRZone/validatePutaway returns
- [x] UI: ModeSelectionScreen — fully bilingual with useLanguage() + t()
- [x] UI: Module2ModeSelectionPage — fully bilingual with useLanguage() + t()
- [x] UI: Module3ModeSelectionPage — fully bilingual with useLanguage() + t()
- [x] UI: ForgotPasswordPage — fully bilingual with useLanguage() + t()
- [x] UI: ResetPasswordPage — fully bilingual with useLanguage() + t()
- [x] Backend: error messages returned to frontend use { reasonFr, reasonEn } + pickReason(validation, req)
- [x] tRPC client: sends Accept-Language header from localStorage lang preference
- [x] Final validation: bilingual error messages confirmed (FR: "L'étape…" / EN: "Step…")

## Production Account Seed (2026-04-08)
- [x] Seed default student account: student@concorde.ca / Student123!
- [x] Seed teacher/admin account: prof@concorde.ca / Teacher123!
- [x] Seed FR student account: etudiant@concorde.ca / Student123!
- [x] Verified live login — student dashboard accessible at /student/scenarios
- [x] All 5 modules visible with 20 scenarios each (M1–M5)
