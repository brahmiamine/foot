"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/apiClient";

interface TeamOption {
  id: string;
  nom: string;
  abbr: string | null;
}

interface FormState {
  clubId: string;
  businessName: string;
  ownerName: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  description: string;
  activityCategory: string;
  taxId: string;
  tradeRegister: string;
}

const initialState: FormState = {
  clubId: "",
  businessName: "",
  ownerName: "",
  email: "",
  password: "",
  phone: "",
  address: "",
  city: "",
  country: "Tunisie",
  description: "",
  activityCategory: "",
  taxId: "",
  tradeRegister: "",
};

const REQUIRED_KEYS = ["clubId", "businessName", "ownerName", "email", "password"];

export default function RegisterPage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api
      .get<TeamOption[]>("/api/teams")
      .then(setTeams)
      .catch(() => setTeams([]));
  }, []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(form).filter(([key, v]) => REQUIRED_KEYS.includes(key) || v !== ""),
      );
      await api.post("/api/auth/register", payload);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Inscription impossible.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontSize: "1.05rem" }}>Inscription reçue</h2>
        <p style={{ color: "var(--sp-text-muted)", fontSize: "0.88rem", lineHeight: 1.5 }}>
          Votre compte est en attente de validation par l&rsquo;administration du club. Vous recevrez un accès complet dès
          l&rsquo;approbation de votre dossier.
        </p>
        <Link href="/login">
          <Button style={{ marginTop: "0.75rem" }}>Aller à la connexion</Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 style={{ margin: "0 0 0.35rem", fontSize: "1.05rem" }}>Devenir vendeur sur le marketplace du club</h2>
      <p style={{ margin: "0 0 1.25rem", fontSize: "0.8rem", color: "var(--sp-text-muted)" }}>
        Votre demande sera examinée par l&rsquo;administration du club avant activation.
      </p>

      {error && (
        <div style={{ background: "var(--sp-danger-soft)", color: "var(--sp-danger)", padding: "0.6rem 0.8rem", borderRadius: 8, fontSize: "0.82rem", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <FormField label="Club / marketplace" required hint="Le vendeur ne verra que les produits, commandes et stocks de ce club.">
        <Select required value={form.clubId} onChange={(e) => set("clubId", e.target.value)}>
          <option value="">Sélectionner un club…</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.nom}
              {team.abbr ? ` (${team.abbr})` : ""}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Nom de l'entreprise" required>
        <Input required value={form.businessName} onChange={(e) => set("businessName", e.target.value)} />
      </FormField>
      <FormField label="Nom du responsable" required>
        <Input required value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)} />
      </FormField>
      <FormField label="Email" required>
        <Input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} />
      </FormField>
      <FormField label="Mot de passe" required hint="8 caractères minimum">
        <Input type="password" required minLength={8} value={form.password} onChange={(e) => set("password", e.target.value)} />
      </FormField>
      <FormField label="Téléphone">
        <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
      </FormField>
      <FormField label="Adresse">
        <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
      </FormField>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <FormField label="Ville">
          <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
        </FormField>
        <FormField label="Pays">
          <Input value={form.country} onChange={(e) => set("country", e.target.value)} />
        </FormField>
      </div>
      <FormField label="Catégorie d'activité" hint="Ex: Textile, Accessoires, Alimentation…">
        <Input value={form.activityCategory} onChange={(e) => set("activityCategory", e.target.value)} />
      </FormField>
      <FormField label="Description de l'activité">
        <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} />
      </FormField>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <FormField label="Identifiant fiscal">
          <Input value={form.taxId} onChange={(e) => set("taxId", e.target.value)} />
        </FormField>
        <FormField label="Registre de commerce">
          <Input value={form.tradeRegister} onChange={(e) => set("tradeRegister", e.target.value)} />
        </FormField>
      </div>

      <Button type="submit" disabled={loading} style={{ width: "100%", marginTop: "0.5rem" }}>
        {loading ? "Envoi…" : "Envoyer ma demande"}
      </Button>

      <p style={{ textAlign: "center", fontSize: "0.82rem", color: "var(--sp-text-muted)", marginTop: "1.25rem" }}>
        Déjà vendeur ?{" "}
        <Link href="/login" style={{ color: "var(--sp-primary)", fontWeight: 600 }}>
          Se connecter
        </Link>
      </p>
    </form>
  );
}
