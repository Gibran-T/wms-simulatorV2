/**
 * LocalLogin — Email/password authentication page for TEC.LOG WMS Simulator
 * Supports both login and self-registration (with optional access code)
 * No Manus account required for students
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, Globe, Moon, Sun, Layers, BookOpen, Award, Clock } from "lucide-react";

export default function LocalLogin() {
  const [, navigate] = useLocation();
  const { language: lang, setLanguage: setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Register state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regCode, setRegCode] = useState("");
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [regError, setRegError] = useState("");

  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.localLogin.useMutation({
    onSuccess: async (data) => {
      await utils.auth.me.invalidate();
      if (data.role === "teacher" || data.role === "admin") {
        navigate("/teacher");
      } else {
        navigate("/student/scenarios");
      }
    },
    onError: (err) => setLoginError(err.message),
  });

  const registerMutation = trpc.auth.localRegister.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      navigate("/student/scenarios");
    },
    onError: (err) => setRegError(err.message),
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    loginMutation.mutate({ email: loginEmail, password: loginPassword });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    if (regPassword !== regConfirm) {
      setRegError(t("Les mots de passe ne correspondent pas", "Passwords do not match"));
      return;
    }
    registerMutation.mutate({
      email: regEmail,
      password: regPassword,
      name: regName,
      accessCode: regCode || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ── TOP NAV ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
              <Layers className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
                TEC.LOG
              </span>
              <span className="hidden sm:inline text-muted-foreground text-xs ml-2">
                Collège de la Concorde
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "FR" ? "EN" : "FR")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm font-medium hover:bg-secondary transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="font-mono font-bold text-xs tracking-widest">{lang}</span>
            </button>
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-md border border-border flex items-center justify-center hover:bg-secondary transition-colors"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left: Course Info */}
          <div className="hidden lg:block">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-400 text-xs font-semibold mb-6 tracking-wide">
              <Award className="w-3.5 h-3.5" />
              {t("Programme certifiant · 30 heures", "Certification Program · 30 hours")}
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-4 leading-tight" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
              {t("Simulateur WMS", "WMS Simulator")}
              <br />
              <span className="text-primary">Mini-WMS Concorde</span>
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed mb-8">
              {t(
                "Maîtrisez les opérations d'entrepôt, la gestion des stocks et les indicateurs de performance logistique à travers 5 modules progressifs.",
                "Master warehouse operations, inventory management and logistics performance indicators through 5 progressive modules."
              )}
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: BookOpen, label: t("5 Modules", "5 Modules"), sub: t("progressifs", "progressive") },
                { icon: Clock, label: "30h", sub: t("de formation", "of training") },
                { icon: Layers, label: t("Simulations", "Simulations"), sub: t("interactives", "interactive") },
                { icon: Award, label: t("Certification", "Certification"), sub: "TEC.LOG" },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-foreground" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{label}</div>
                    <div className="text-xs text-muted-foreground">{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Auth Form */}
          <div className="w-full max-w-md mx-auto">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">{t("Connexion", "Sign In")}</TabsTrigger>
                <TabsTrigger value="register">{t("Créer un compte", "Create Account")}</TabsTrigger>
              </TabsList>

              {/* ── LOGIN TAB ── */}
              <TabsContent value="login">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("Connexion", "Sign In")}</CardTitle>
                    <CardDescription>
                      {t("Entrez vos identifiants pour accéder au simulateur", "Enter your credentials to access the simulator")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">{t("Adresse email", "Email address")}</Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="etudiant@concordia.ca"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          required
                          autoComplete="email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">{t("Mot de passe", "Password")}</Label>
                        <div className="relative">
                          <Input
                            id="login-password"
                            type={showLoginPwd ? "text" : "password"}
                            placeholder="••••••••"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginPwd(!showLoginPwd)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showLoginPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      {loginError && (
                        <Alert variant="destructive">
                          <AlertDescription>{loginError}</AlertDescription>
                        </Alert>
                      )}
                      <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                        {loginMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {t("Se connecter", "Sign In")}
                      </Button>
                    </form>
                    <div className="mt-4 pt-4 border-t border-border text-center">
                      <p className="text-xs text-muted-foreground">
                        {t("Vous n'avez pas de compte ? Utilisez l'onglet \"Créer un compte\".", "No account? Use the \"Create Account\" tab.")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── REGISTER TAB ── */}
              <TabsContent value="register">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("Créer un compte étudiant", "Create Student Account")}</CardTitle>
                    <CardDescription>
                      {t("Inscrivez-vous avec le code d'accès fourni par votre professeur", "Register with the access code provided by your teacher")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reg-name">{t("Nom complet", "Full name")}</Label>
                        <Input
                          id="reg-name"
                          type="text"
                          placeholder={t("Prénom Nom", "First Last")}
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          required
                          autoComplete="name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-email">{t("Adresse email", "Email address")}</Label>
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder="etudiant@concordia.ca"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          required
                          autoComplete="email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-password">{t("Mot de passe", "Password")}</Label>
                        <div className="relative">
                          <Input
                            id="reg-password"
                            type={showRegPwd ? "text" : "password"}
                            placeholder={t("6 caractères minimum", "6 characters minimum")}
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            required
                            minLength={6}
                            autoComplete="new-password"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPwd(!showRegPwd)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showRegPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-confirm">{t("Confirmer le mot de passe", "Confirm password")}</Label>
                        <Input
                          id="reg-confirm"
                          type="password"
                          placeholder="••••••••"
                          value={regConfirm}
                          onChange={(e) => setRegConfirm(e.target.value)}
                          required
                          autoComplete="new-password"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-code">
                          {t("Code d'accès", "Access code")}
                          <span className="text-muted-foreground ml-1 text-xs">({t("optionnel", "optional")})</span>
                        </Label>
                        <Input
                          id="reg-code"
                          type="text"
                          placeholder="TECLOG2025"
                          value={regCode}
                          onChange={(e) => setRegCode(e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                      {regError && (
                        <Alert variant="destructive">
                          <AlertDescription>{regError}</AlertDescription>
                        </Alert>
                      )}
                      <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                        {registerMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {t("Créer mon compte", "Create Account")}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-4 px-6 text-center text-xs text-muted-foreground">
        TEC.LOG — Mini-WMS Concorde · Collège de la Concorde · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
