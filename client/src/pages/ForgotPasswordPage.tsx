/**
 * ForgotPasswordPage — Request a password reset link
 * Public page: no auth required
 * Since the platform cannot send emails directly, the reset link is shown
 * on-screen and the teacher is notified via the notification API.
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, KeyRound, ArrowLeft, Mail, CheckCircle2, Copy } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface FormData {
  email: string;
}

export default function ForgotPasswordPage() {
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { language } = useLanguage();
  const t = (fr: string, en: string) => language === "FR" ? fr : en;

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  const requestReset = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: (data) => {
      if (data.resetUrl) {
        setResetUrl(data.resetUrl);
      } else {
        toast.success(t("Demande envoyée. Votre enseignant a été notifié.", "Request sent. Your teacher has been notified."));
      }
    },
    onError: (err) => {
      toast.error(err.message || t("Erreur lors de la demande de réinitialisation.", "Error during reset request."));
    },
  });

  const onSubmit = (data: FormData) => {
    requestReset.mutate({ email: data.email });
  };

  const copyToClipboard = async () => {
    if (!resetUrl) return;
    try {
      await navigator.clipboard.writeText(resetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("Impossible de copier le lien.", "Unable to copy the link."));
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
            <KeyRound className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
            {t("Mot de passe oublié", "Forgot Password")}
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            {t(
              "Entrez votre adresse email pour générer un lien de réinitialisation.",
              "Enter your email address to generate a reset link."
            )}
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          {!resetUrl ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t("Adresse email", "Email address")}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder={t("votre.email@exemple.com", "your.email@example.com")}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    {...register("email", {
                      required: t("L'email est requis", "Email is required"),
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t("Email invalide", "Invalid email") },
                    })}
                  />
                </div>
                {errors.email && (
                  <p className="text-destructive text-xs mt-1">{errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={requestReset.isPending}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {requestReset.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {t("Génération du lien...", "Generating link...")}</>
                ) : (
                  t("Générer le lien de réinitialisation", "Generate reset link")
                )}
              </button>
            </form>
          ) : (
            /* Success: show reset link */
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{t("Lien généré avec succès", "Link generated successfully")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t(
                      "Votre enseignant a été notifié. Vous pouvez également utiliser le lien ci-dessous directement.",
                      "Your teacher has been notified. You can also use the link below directly."
                    )}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  {t("Lien de réinitialisation (valide 1 heure)", "Reset link (valid 1 hour)")}
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 rounded-lg border border-border bg-secondary text-xs text-muted-foreground font-mono break-all">
                    {resetUrl}
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="flex-shrink-0 p-2 rounded-lg border border-border hover:bg-secondary transition-colors"
                    title={t("Copier le lien", "Copy link")}
                  >
                    {copied ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              <a
                href={resetUrl}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                {t("Réinitialiser mon mot de passe →", "Reset my password →")}
              </a>
            </div>
          )}
        </div>

        {/* Back to login */}
        <div className="text-center mt-4">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            {t("Retour à la connexion", "Back to login")}
          </Link>
        </div>
      </div>
    </div>
  );
}
