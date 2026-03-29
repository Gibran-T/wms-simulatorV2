/**
 * ResetPasswordPage — Set a new password using a reset token
 * Public page: no auth required
 * Route: /reset-password/:token
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, KeyRound, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface FormData {
  newPassword: string;
  confirmPassword: string;
}

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const { language } = useLanguage();
  const t = (fr: string, en: string) => language === "FR" ? fr : en;

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>();
  const newPassword = watch("newPassword");

  const resetPassword = trpc.auth.resetPasswordWithToken.useMutation({
    onSuccess: () => {
      setSuccess(true);
      toast.success(t("Mot de passe réinitialisé avec succès !", "Password reset successfully!"));
      setTimeout(() => navigate("/login"), 3000);
    },
    onError: (err) => {
      toast.error(err.message || t("Erreur lors de la réinitialisation.", "Error during reset."));
    },
  });

  const onSubmit = (data: FormData) => {
    if (!token) {
      toast.error(t("Token manquant. Veuillez utiliser le lien complet.", "Missing token. Please use the full link."));
      return;
    }
    resetPassword.mutate({ token, newPassword: data.newPassword });
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">{t("Lien invalide", "Invalid link")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("Ce lien de réinitialisation est invalide ou incomplet.", "This reset link is invalid or incomplete.")}
          </p>
          <a href="/forgot-password" className="mt-4 inline-block text-sm text-primary hover:underline">
            {t("Demander un nouveau lien", "Request a new link")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
            <KeyRound className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
            {t("Nouveau mot de passe", "New Password")}
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            {t("Choisissez un nouveau mot de passe sécurisé.", "Choose a new secure password.")}
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          {success ? (
            <div className="text-center py-4 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
              <p className="font-semibold text-foreground">{t("Mot de passe mis à jour !", "Password updated!")}</p>
              <p className="text-sm text-muted-foreground">
                {t("Redirection vers la connexion dans 3 secondes...", "Redirecting to login in 3 seconds...")}
              </p>
              <a href="/login" className="inline-block text-sm text-primary hover:underline">
                {t("Se connecter maintenant →", "Login now →")}
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* New password */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t("Nouveau mot de passe", "New password")}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={t("Minimum 6 caractères", "Minimum 6 characters")}
                    className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    {...register("newPassword", {
                      required: t("Le mot de passe est requis", "Password is required"),
                      minLength: { value: 6, message: t("Minimum 6 caractères", "Minimum 6 characters") },
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-destructive text-xs mt-1">{errors.newPassword.message}</p>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t("Confirmer le mot de passe", "Confirm password")}
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder={t("Répétez le mot de passe", "Repeat password")}
                    className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    {...register("confirmPassword", {
                      required: t("Veuillez confirmer le mot de passe", "Please confirm your password"),
                      validate: (value) => value === newPassword || t("Les mots de passe ne correspondent pas", "Passwords do not match"),
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-destructive text-xs mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={resetPassword.isPending}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {resetPassword.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {t("Réinitialisation...", "Resetting...")}</>
                ) : (
                  t("Réinitialiser le mot de passe", "Reset password")
                )}
              </button>
            </form>
          )}
        </div>

        {/* Back to login */}
        <div className="text-center mt-4">
          <a href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← {t("Retour à la connexion", "Back to login")}
          </a>
        </div>
      </div>
    </div>
  );
}
