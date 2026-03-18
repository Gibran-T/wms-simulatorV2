import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import {
  LogOut, LayoutDashboard, BookOpen, Users, ClipboardList,
  BarChart2, Settings, ChevronRight, Menu, X, ChevronLeft,
  ChevronRight as ChevronRightIcon, MonitorPlay, Moon, Sun, Globe,
  Presentation, UserCircle, ShieldCheck, GraduationCap, TrendingUp,
} from "lucide-react";
import Login from "@/pages/Login";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663029779635/KgVchfh3nwnwCSCPgkNzAq/concorde-logo_73f38483.png";
const APP_VERSION = "v1.0";

interface FioriShellProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export default function FioriShell({ children, title, breadcrumbs }: FioriShellProps) {
  const { user, isAuthenticated, loading } = useAuth();
  const [location, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/"; },
  });

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f7f7] dark:bg-[#0a1628]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#0070f2] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("Chargement du simulateur...", "Loading simulator...")}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const isAdmin = user?.role === "admin";

  const COURSE_NAME = t(
    "Gestion intégrée des stocks et performance logistique",
    "Integrated Stock Management & Logistics Performance"
  );
  const PROGRAMME_CODE = t("Programme 1 — TEC.LOG", "Program 1 — TEC.LOG");

  const navItems = isTeacher
    ? [
        { href: "/teacher", label: t("Tableau de bord", "Dashboard"), icon: LayoutDashboard },
        { href: "/teacher/cohorts", label: t("Cohortes", "Cohorts"), icon: Users },
        { href: "/teacher/scenarios", label: t("Scénarios", "Scenarios"), icon: BookOpen },
        { href: "/teacher/assignments", label: t("Assignments", "Assignments"), icon: ClipboardList },
        { href: "/teacher/monitor", label: t("Monitoring", "Monitoring"), icon: BarChart2 },
        { href: "/teacher/analytics", label: t("Analytics", "Analytics"), icon: TrendingUp },
        { href: "/student/scenarios", label: t("Simulateur", "Simulator"), icon: MonitorPlay },
      ]
    : [
        { href: "/student/scenarios", label: t("Mes Scénarios", "My Scenarios"), icon: BookOpen },
        { href: "/student/slides", label: t("Slides", "Slides"), icon: Presentation },
      ];

  if (isAdmin) {
    navItems.push({ href: "/admin", label: t("Administration", "Administration"), icon: Settings });
  }

  // Determine first initial for avatar
  const initials = (user?.name || user?.email || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const roleLabel = isAdmin
    ? t("Administrateur", "Administrator")
    : isTeacher
    ? t("Enseignant", "Teacher")
    : t("Étudiant", "Student");

  const roleColor = isAdmin ? "#bb0000" : isTeacher ? "#0070f2" : "#107e3e";

  return (
    <div className={`min-h-screen flex flex-col ${theme === "dark" ? "bg-[#0a1628]" : "bg-[#f7f7f7]"}`}>
      {/* ── Shell Bar ─────────────────────────────────────────────────────── */}
      <header className="fiori-shell-bar z-50 fixed top-0 left-0 right-0">
        {/* Logo + Institutional title */}
        <div className="flex items-center gap-3 mr-3 shrink-0">
          <img
            src={LOGO_URL}
            alt="Collège de la Concorde"
            className="h-7 object-contain brightness-0 invert"
          />
          <div className="hidden lg:block border-l border-white/20 pl-3">
            <p className="text-xs font-semibold text-white leading-tight">Collège de la Concorde — Montréal</p>
            <p className="text-[10px] text-white/60 leading-tight">
              {t("Simulateur pédagogique ERP/WMS", "ERP/WMS Pedagogical Simulator")}
            </p>
          </div>
        </div>

        {/* Course name badge — hidden on small screens */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-md shrink-0 mr-2" style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)" }}>
          <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{PROGRAMME_CODE}</span>
          <span className="text-white/40 text-[10px]">—</span>
          <span className="text-[11px] font-semibold text-white">{COURSE_NAME}</span>
        </div>

        {/* Course badge — compact for md-xl */}
        <div className="hidden md:flex xl:hidden items-center gap-2 px-2.5 py-1 rounded-md shrink-0 mr-2" style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)" }}>
          <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">TEC.LOG</span>
        </div>

        {/* Nav — desktop (collapsible) */}
        {!navCollapsed && (
          <nav className="hidden md:flex items-center gap-0.5 flex-1 overflow-x-auto scrollbar-none min-w-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location === item.href || location.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded text-[10px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active ? "bg-white/20 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon size={12} className="shrink-0" />
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}
        {navCollapsed && <div className="flex-1" />}

        {/* Nav collapse toggle (desktop) */}
        <button
          onClick={() => setNavCollapsed((v) => !v)}
          className="hidden md:flex items-center justify-center w-6 h-6 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors mr-1 shrink-0"
          title={navCollapsed ? t("Afficher la navigation", "Show navigation") : t("Réduire la navigation", "Collapse navigation")}
        >
          {navCollapsed ? <ChevronRightIcon size={13} /> : <ChevronLeft size={13} />}
        </button>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors mr-1 shrink-0"
          title="Menu"
        >
          {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
        </button>

        {/* ── Right controls: Lang + Dark + User Avatar Dropdown ──────────── */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0">

          {/* Language toggle FR/EN */}
          <button
            onClick={() => setLanguage(language === "FR" ? "EN" : "FR")}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold font-mono text-white/80 hover:text-white hover:bg-white/15 transition-colors border border-white/20 shrink-0"
            title={language === "FR" ? "Switch to English" : "Passer en français"}
          >
            <Globe size={11} />
            {language}
          </button>

          {/* Dark mode toggle */}
          {toggleTheme && (
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-7 h-7 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              title={theme === "dark" ? t("Mode clair", "Light mode") : t("Mode sombre", "Dark mode")}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          )}

          {/* ── User Avatar Dropdown ─────────────────────────────────────── */}
          <div className="relative shrink-0" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/10 transition-colors group"
              title={t("Menu utilisateur", "User menu")}
            >
              {/* Avatar circle */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                style={{ backgroundColor: roleColor }}
              >
                {initials}
              </div>
              {/* Name + role — visible from lg */}
              <div className="hidden lg:block text-left">
                <p className="text-[11px] font-semibold text-white leading-tight max-w-[120px] truncate">
                  {user?.name || user?.email}
                </p>
                <p className="text-[9px] leading-tight" style={{ color: roleColor === "#bb0000" ? "#ff8080" : roleColor === "#0070f2" ? "#80c0ff" : "#80e0a0" }}>
                  {roleLabel}
                </p>
              </div>
            </button>

            {/* Dropdown */}
            {userMenuOpen && (
              <div className={`absolute right-0 top-full mt-1 w-56 rounded-lg shadow-xl border z-[100] py-1 ${
                theme === "dark" ? "bg-[#0f2a44] border-[#1a3a5c]" : "bg-white border-gray-200"
              }`}>
                {/* User info header */}
                <div className={`px-4 py-3 border-b ${theme === "dark" ? "border-[#1a3a5c]" : "border-gray-100"}`}>
                  <p className={`text-sm font-semibold truncate ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    {user?.name || user?.email}
                  </p>
                  <p className="text-xs" style={{ color: roleColor }}>
                    {roleLabel}
                  </p>
                  {user?.email && (
                    <p className={`text-[10px] truncate mt-0.5 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                      {user.email}
                    </p>
                  )}
                </div>

                {/* Switch view — admin/teacher only */}
                {isTeacher && (
                  <>
                    <div className={`px-3 py-1.5 ${theme === "dark" ? "text-gray-500" : "text-gray-400"} text-[10px] uppercase tracking-wider font-semibold`}>
                      {t("Changer de vue", "Switch view")}
                    </div>
                    <button
                      onClick={() => { setUserMenuOpen(false); navigate("/teacher"); }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs transition-colors ${
                        location.startsWith("/teacher")
                          ? theme === "dark" ? "bg-white/10 text-white" : "bg-blue-50 text-blue-700"
                          : theme === "dark" ? "text-gray-300 hover:bg-white/10 hover:text-white" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <ShieldCheck size={13} style={{ color: "#0070f2" }} />
                      {t("Vue Enseignant", "Teacher View")}
                      {location.startsWith("/teacher") && (
                        <span className="ml-auto text-[9px] font-bold text-[#0070f2]">✓</span>
                      )}
                    </button>
                    <button
                      onClick={() => { setUserMenuOpen(false); navigate("/student/scenarios"); }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs transition-colors ${
                        location.startsWith("/student")
                          ? theme === "dark" ? "bg-white/10 text-white" : "bg-green-50 text-green-700"
                          : theme === "dark" ? "text-gray-300 hover:bg-white/10 hover:text-white" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <GraduationCap size={13} style={{ color: "#107e3e" }} />
                      {t("Vue Étudiant", "Student View")}
                      {location.startsWith("/student") && (
                        <span className="ml-auto text-[9px] font-bold text-[#107e3e]">✓</span>
                      )}
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => { setUserMenuOpen(false); navigate("/admin"); }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs transition-colors ${
                          location.startsWith("/admin")
                            ? theme === "dark" ? "bg-white/10 text-white" : "bg-red-50 text-red-700"
                            : theme === "dark" ? "text-gray-300 hover:bg-white/10 hover:text-white" : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <Settings size={13} style={{ color: "#bb0000" }} />
                        {t("Administration", "Administration")}
                        {location.startsWith("/admin") && (
                          <span className="ml-auto text-[9px] font-bold text-[#bb0000]">✓</span>
                        )}
                      </button>
                    )}
                    <div className={`my-1 border-t ${theme === "dark" ? "border-[#1a3a5c]" : "border-gray-100"}`} />
                  </>
                )}

                {/* Profile */}
                <button
                  onClick={() => { setUserMenuOpen(false); navigate("/student/profile"); }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs transition-colors ${
                    theme === "dark" ? "text-gray-300 hover:bg-white/10 hover:text-white" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <UserCircle size={13} />
                  {t("Mon profil", "My profile")}
                </button>

                {/* Logout */}
                <button
                  onClick={() => { setUserMenuOpen(false); logout.mutate(); }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs transition-colors text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20`}
                >
                  <LogOut size={13} />
                  {t("Déconnexion", "Sign out")}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile Nav Dropdown ─────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed top-[44px] left-0 right-0 z-50 bg-[#0f2a44] border-b border-white/10 shadow-lg md:hidden">
          <nav className="flex flex-col py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location === item.href || location.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                    active ? "bg-white/15 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon size={15} />
                  {item.label}
                </Link>
              );
            })}
            {/* Mobile: lang + dark mode */}
            <div className="flex items-center gap-3 px-5 py-3 border-t border-white/10">
              <button
                onClick={() => setLanguage(language === "FR" ? "EN" : "FR")}
                className="flex items-center gap-1 text-xs font-bold text-white/70 hover:text-white"
              >
                <Globe size={13} />
                {language === "FR" ? "FR → EN" : "EN → FR"}
              </button>
              {toggleTheme && (
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-1 text-xs text-white/70 hover:text-white"
                >
                  {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
                  {theme === "dark" ? t("Mode clair", "Light mode") : t("Mode sombre", "Dark mode")}
                </button>
              )}
            </div>
            {/* Mobile: logout */}
            <button
              onClick={() => { setMobileMenuOpen(false); logout.mutate(); }}
              className="flex items-center gap-3 px-5 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 border-t border-white/10"
            >
              <LogOut size={15} />
              {t("Déconnexion", "Sign out")}
            </button>
          </nav>
        </div>
      )}
      {/* ── Page Header (breadcrumbs + title) ─────────────────────────────── */}
      {(title || (breadcrumbs && breadcrumbs.length > 0)) && (
        <div className={`fixed top-[44px] left-0 right-0 z-40 border-b px-6 py-2.5 ${
          theme === "dark"
            ? "bg-[#0d2137] border-[#1a3a5c]"
            : "bg-white border-[#d9d9d9]"
        }`}>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className={`flex items-center gap-1 text-xs mb-0.5 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight size={10} />}
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-[#0070f2]">{crumb.label}</Link>
                  ) : (
                    <span className={theme === "dark" ? "text-gray-300" : "text-gray-600"}>{crumb.label}</span>
                  )}
                </span>
              ))}
            </div>
          )}
          {title && (
            <h1 className={`text-sm font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {title}
            </h1>
          )}
        </div>
      )}

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <main className={`flex-1 ${(title || (breadcrumbs && breadcrumbs.length > 0)) ? "mt-[88px]" : "mt-[44px]"} p-6`}>
        {children}
      </main>

      {/* ── Institutional Footer ───────────────────────────────────────────── */}
      <footer className={`border-t mt-auto ${theme === "dark" ? "bg-[#0d2137] border-[#1a3a5c]" : "bg-white border-[#e0e0e0]"}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <img
              src={LOGO_URL}
              alt="Collège de la Concorde"
              className={`h-5 object-contain ${theme === "dark" ? "opacity-40 brightness-0 invert" : "opacity-60"}`}
            />
            <div>
              <p className={`text-[10px] leading-snug ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>
                © 2026 Collège de la Concorde — Montréal. {t("Tous droits réservés.", "All rights reserved.")}
              </p>
              <p className={`text-[10px] leading-snug ${theme === "dark" ? "text-gray-600" : "text-gray-400"}`}>
                {t(
                  "Usage pédagogique uniquement. Reproduction, diffusion ou utilisation commerciale interdite sans autorisation.",
                  "For educational use only. Reproduction, distribution or commercial use prohibited without authorization."
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <p className={`text-[10px] font-mono ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                {APP_VERSION} — Mini-WMS ERP/WMS Simulator
              </p>
              <Link href="/" className={`text-[10px] hover:text-[#0070f2] hover:underline ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                {PROGRAMME_CODE} — {COURSE_NAME}
              </Link>
            </div>
            <Link href="/legal" className="text-[10px] text-[#0070f2] hover:underline">
              {t("Mentions légales", "Legal notices")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
