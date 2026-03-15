import FioriShell from "@/components/FioriShell";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Shield, Users, BookOpen, UserCheck, UserX, Crown,
  GraduationCap, User, RefreshCw, Info, Mail, Plus,
  Trash2, CheckCircle, Clock,
} from "lucide-react";
import { useState } from "react";

type Role = "student" | "teacher" | "admin";

const ROLE_CONFIG: Record<Role, { label: string; labelEn: string; color: string; bg: string; icon: React.ElementType }> = {
  admin:   { label: "Administrateur", labelEn: "Administrator", color: "text-red-600 dark:text-red-400",    bg: "bg-red-50 dark:bg-red-950/40",    icon: Crown },
  teacher: { label: "Enseignant",      labelEn: "Teacher",       color: "text-blue-600 dark:text-blue-400",  bg: "bg-blue-50 dark:bg-blue-950/40",  icon: GraduationCap },
  student: { label: "Étudiant",        labelEn: "Student",       color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/40", icon: User },
};

export default function AdminPanel() {
  const { t } = useLanguage();

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: scenarios } = trpc.scenarios.list.useQuery();
  const { data: cohorts }   = trpc.cohorts.list.useQuery();
  const { data: runs }      = trpc.monitor.allRuns.useQuery();
  const { data: users, refetch: refetchUsers } = trpc.admin.users.useQuery();
  const { data: preAuth, refetch: refetchPreAuth } = trpc.admin.listPreAuthorized.useQuery();

  // ── Mutations ─────────────────────────────────────────────────────────────
  const setRole         = trpc.admin.setRole.useMutation({ onSuccess: () => refetchUsers() });
  const addPreAuth      = trpc.admin.addPreAuthorized.useMutation({ onSuccess: () => refetchPreAuth() });
  const removePreAuth   = trpc.admin.removePreAuthorized.useMutation({ onSuccess: () => refetchPreAuth() });

  // ── Local state ───────────────────────────────────────────────────────────
  const [confirmPending, setConfirmPending] = useState<{ userId: number; name: string; newRole: Role } | null>(null);
  const [processing, setProcessing]         = useState<number | null>(null);
  const [newEmail, setNewEmail]             = useState("");
  const [newRole, setNewRole]               = useState<Role>("admin");
  const [newNote, setNewNote]               = useState("");
  const [addingEmail, setAddingEmail]       = useState(false);
  const [addError, setAddError]             = useState("");

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleRoleChange = async (userId: number, role: Role) => {
    setProcessing(userId);
    try {
      await setRole.mutateAsync({ userId, role });
    } finally {
      setProcessing(null);
      setConfirmPending(null);
    }
  };

  const handleAddEmail = async () => {
    setAddError("");
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setAddError(t("Email invalide.", "Invalid email address."));
      return;
    }
    setAddingEmail(true);
    try {
      await addPreAuth.mutateAsync({ email: trimmed, role: newRole, note: newNote.trim() || undefined });
      setNewEmail("");
      setNewNote("");
    } catch {
      setAddError(t("Erreur lors de l'ajout.", "Error adding email."));
    } finally {
      setAddingEmail(false);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = [
    { icon: BookOpen,  label: t("Scénarios", "Scenarios"),                    value: scenarios?.length ?? 0, color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-950/40" },
    { icon: Users,     label: t("Cohortes", "Cohorts"),                        value: cohorts?.length ?? 0,   color: "text-green-600 dark:text-green-400",  bg: "bg-green-50 dark:bg-green-950/40" },
    { icon: Shield,    label: t("Simulations totales", "Total Simulations"),   value: runs?.length ?? 0,      color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/40" },
    { icon: Users,     label: t("Utilisateurs inscrits", "Registered Users"),  value: users?.length ?? 0,     color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-50 dark:bg-amber-950/40" },
  ];

  return (
    <FioriShell
      title={t("Panneau d'Administration", "Administration Panel")}
      breadcrumbs={[{ label: t("Administration", "Administration") }]}
    >
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(card => (
            <div key={card.label} className="bg-card border border-border rounded-md p-4">
              <div className={`w-9 h-9 ${card.bg} rounded-md flex items-center justify-center mb-3`}>
                <card.icon size={16} className={card.color} />
              </div>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>

        {/* ── How to authorize Nadia banner ── */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-md p-4 flex items-start gap-3">
          <Crown size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
              {t("Comment autoriser Nadia (ou tout autre admin) ?", "How to authorize Nadia (or any admin)?")}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              {t(
                "1. Nadia se connecte avec son email. Elle apparaît dans la liste ci-dessous comme « Étudiant ». 2. Cliquez sur « → Admin » à côté de son nom. Elle aura immédiatement accès complet. Vous pouvez aussi pré-autoriser son email ci-dessous pour qu'elle soit Admin dès sa première connexion.",
                "1. Nadia logs in with her email. She appears in the list below as 'Student'. 2. Click '→ Admin' next to her name. She will immediately have full access. You can also pre-authorize her email below so she is Admin from her very first login."
              )}
            </p>
          </div>
        </div>

        {/* ── Pre-authorized Emails ── */}
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                {t("Emails pré-autorisés", "Pre-authorized Emails")}
              </p>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {preAuth?.length ?? 0}
              </span>
            </div>
          </div>

          {/* Add email form */}
          <div className="px-5 py-4 border-b border-border bg-secondary/20">
            <p className="text-xs text-muted-foreground mb-3">
              {t(
                "Ajoutez l'email de Nadia ici. Dès qu'elle se connecte, le rôle lui sera attribué automatiquement.",
                "Add Nadia's email here. As soon as she logs in, the role will be assigned automatically."
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddEmail()}
                placeholder={t("email@exemple.com", "email@example.com")}
                className="flex-1 text-xs px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <select
                value={newRole}
                onChange={e => setNewRole(e.target.value as Role)}
                className="text-xs px-3 py-2 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="admin">{t("Administrateur", "Administrator")}</option>
                <option value="teacher">{t("Enseignant", "Teacher")}</option>
                <option value="student">{t("Étudiant", "Student")}</option>
              </select>
              <input
                type="text"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder={t("Note (ex: Nadia — directrice)", "Note (e.g. Nadia — director)")}
                className="flex-1 text-xs px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleAddEmail}
                disabled={addingEmail}
                className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                <Plus size={12} />
                {addingEmail ? t("Ajout...", "Adding...") : t("Ajouter", "Add")}
              </button>
            </div>
            {addError && <p className="text-xs text-red-500 mt-2">{addError}</p>}
          </div>

          {/* Pre-auth list */}
          {!preAuth || preAuth.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-xs">
              {t("Aucun email pré-autorisé. Ajoutez l'email de Nadia ci-dessus.", "No pre-authorized emails. Add Nadia's email above.")}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {preAuth.map(entry => (
                <div key={entry.id} className="flex items-center justify-between px-5 py-3 hover:bg-secondary/20 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${ROLE_CONFIG[entry.role as Role]?.bg ?? "bg-secondary"}`}>
                      {entry.usedAt
                        ? <CheckCircle size={13} className="text-green-600 dark:text-green-400" />
                        : <Clock size={13} className={ROLE_CONFIG[entry.role as Role]?.color ?? "text-muted-foreground"} />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{entry.email}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-bold ${ROLE_CONFIG[entry.role as Role]?.color ?? "text-muted-foreground"}`}>
                          {t(ROLE_CONFIG[entry.role as Role]?.label ?? entry.role, ROLE_CONFIG[entry.role as Role]?.labelEn ?? entry.role)}
                        </span>
                        {entry.note && (
                          <span className="text-[10px] text-muted-foreground">· {entry.note}</span>
                        )}
                        {entry.usedAt ? (
                          <span className="text-[10px] text-green-600 dark:text-green-400">
                            · {t("Utilisé le", "Used on")} {new Date(entry.usedAt).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400">
                            · {t("En attente de connexion", "Awaiting first login")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removePreAuth.mutateAsync({ id: entry.id })}
                    className="ml-3 p-1.5 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex-shrink-0"
                    title={t("Supprimer", "Remove")}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── User Management Table ── */}
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                {t("Utilisateurs inscrits", "Registered Users")}
              </p>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {users?.length ?? 0} {t("utilisateurs", "users")}
              </span>
            </div>
            <button
              onClick={() => refetchUsers()}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw size={12} />
              {t("Actualiser", "Refresh")}
            </button>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 border-b border-border px-5 py-3 flex items-start gap-2">
            <Info size={13} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-400">
              {t(
                "Quand Nadia se connecte, elle apparaît ici. Cliquez sur « → Admin » pour lui donner accès complet.",
                "When Nadia logs in, she will appear here. Click '→ Admin' to give her full access."
              )}
            </p>
          </div>

          {!users || users.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              {t("Aucun utilisateur inscrit.", "No registered users.")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50 border-b border-border">
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t("Utilisateur", "User")}
                    </th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                      {t("Email", "Email")}
                    </th>
                    <th className="text-center px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t("Rôle", "Role")}
                    </th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                      {t("Dernière connexion", "Last Login")}
                    </th>
                    <th className="text-center px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t("Actions", "Actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, i) => {
                    const role = (user.role ?? "student") as Role;
                    const cfg = ROLE_CONFIG[role];
                    const RoleIcon = cfg.icon;
                    const isProcessing = processing === user.id;

                    return (
                      <tr key={user.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-secondary/20"} hover:bg-secondary/40 transition-colors`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                              <RoleIcon size={14} className={cfg.color} />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground text-xs">{user.name ?? t("Sans nom", "No name")}</p>
                              <p className="text-[10px] text-muted-foreground md:hidden">{user.email ?? "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 hidden md:table-cell">
                          <p className="text-xs text-muted-foreground">{user.email ?? "—"}</p>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                            <RoleIcon size={10} />
                            {t(cfg.label, cfg.labelEn)}
                          </span>
                        </td>
                        <td className="px-5 py-3 hidden lg:table-cell">
                          <p className="text-xs text-muted-foreground">
                            {user.lastSignedIn
                              ? new Date(user.lastSignedIn).toLocaleDateString(t("fr-CA", "en-CA"), { day: "2-digit", month: "short", year: "numeric" })
                              : "—"}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-center">
                          {role === "admin" ? (
                            <span className="text-xs text-muted-foreground italic">{t("Propriétaire", "Owner")}</span>
                          ) : (
                            <div className="flex items-center justify-center gap-2 flex-wrap">
                              {role === "student" && (
                                <>
                                  <button
                                    onClick={() => setConfirmPending({ userId: user.id, name: user.name ?? "?", newRole: "teacher" })}
                                    disabled={isProcessing}
                                    className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                                  >
                                    <UserCheck size={10} />
                                    {t("→ Enseignant", "→ Teacher")}
                                  </button>
                                  <button
                                    onClick={() => setConfirmPending({ userId: user.id, name: user.name ?? "?", newRole: "admin" })}
                                    disabled={isProcessing}
                                    className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                                  >
                                    <Crown size={10} />
                                    {t("→ Admin", "→ Admin")}
                                  </button>
                                </>
                              )}
                              {role === "teacher" && (
                                <>
                                  <button
                                    onClick={() => setConfirmPending({ userId: user.id, name: user.name ?? "?", newRole: "admin" })}
                                    disabled={isProcessing}
                                    className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                                  >
                                    <Crown size={10} />
                                    {t("→ Admin", "→ Admin")}
                                  </button>
                                  <button
                                    onClick={() => setConfirmPending({ userId: user.id, name: user.name ?? "?", newRole: "student" })}
                                    disabled={isProcessing}
                                    className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded bg-secondary text-foreground hover:bg-secondary/80 border border-border transition-colors disabled:opacity-50"
                                  >
                                    <UserX size={10} />
                                    {t("→ Étudiant", "→ Student")}
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Role Legend ── */}
        <div className="bg-card border border-border rounded-md p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t("Légende des rôles", "Role Legend")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(Object.entries(ROLE_CONFIG) as [Role, typeof ROLE_CONFIG[Role]][]).map(([role, cfg]) => {
              const RoleIcon = cfg.icon;
              return (
                <div key={role} className={`rounded-md p-3 ${cfg.bg} border border-border`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <RoleIcon size={14} className={cfg.color} />
                    <span className={`text-xs font-bold ${cfg.color}`}>{t(cfg.label, cfg.labelEn)}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {role === "admin" && t(
                      "Accès complet. Peut gérer les rôles, voir toutes les données et configurer le système.",
                      "Full access. Can manage roles, view all data, and configure the system."
                    )}
                    {role === "teacher" && t(
                      "Accès enseignant. Peut créer des scénarios, gérer des cohortes et surveiller les étudiants.",
                      "Teacher access. Can create scenarios, manage cohorts, and monitor students."
                    )}
                    {role === "student" && t(
                      "Accès étudiant. Peut accéder aux slides, exécuter des simulations et voir ses résultats.",
                      "Student access. Can access slides, run simulations, and view their own results."
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── Confirmation Modal ── */}
      {confirmPending && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
                <Shield size={18} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">
                  {t("Confirmer le changement de rôle", "Confirm Role Change")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("Cette action est réversible.", "This action is reversible.")}
                </p>
              </div>
            </div>
            <p className="text-sm text-foreground mb-5">
              {t(
                `Attribuer le rôle « ${ROLE_CONFIG[confirmPending.newRole].label} » à ${confirmPending.name} ?`,
                `Assign the role "${ROLE_CONFIG[confirmPending.newRole].labelEn}" to ${confirmPending.name}?`
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleRoleChange(confirmPending.userId, confirmPending.newRole)}
                disabled={processing !== null}
                className="flex-1 bg-blue-600 text-white text-xs font-bold py-2.5 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {processing !== null ? t("En cours...", "Processing...") : t("Confirmer", "Confirm")}
              </button>
              <button
                onClick={() => setConfirmPending(null)}
                disabled={processing !== null}
                className="flex-1 bg-secondary text-foreground text-xs font-bold py-2.5 rounded-md hover:bg-secondary/80 border border-border transition-colors"
              >
                {t("Annuler", "Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </FioriShell>
  );
}
