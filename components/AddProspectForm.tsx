"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProspect } from "@/lib/prospecting-actions";

const BUSINESS_TYPES = [
  { value: "restaurant", label: "🍽️ Restaurant / Café / Brasserie" },
  { value: "coiffeur", label: "💇 Coiffeur / Barbier" },
  { value: "beaute", label: "💅 Institut de beauté / Spa" },
  { value: "plombier", label: "🔧 Plombier / Chauffagiste" },
  { value: "electricien", label: "⚡ Électricien" },
  { value: "maconnerie", label: "🧱 Maçon / Artisan BTP" },
  { value: "garage", label: "🚗 Garage / Mécanicien auto" },
  { value: "medecin", label: "⚕️ Médecin / Cabinet médical" },
  { value: "dentiste", label: "🦷 Dentiste" },
  { value: "avocat", label: "⚖️ Avocat / Cabinet juridique" },
  { value: "comptable", label: "📊 Expert-comptable" },
  { value: "immobilier", label: "🏠 Agence immobilière" },
  { value: "fleuriste", label: "🌸 Fleuriste / Jardinerie" },
  { value: "photographe", label: "📷 Photographe / Vidéaste" },
  { value: "coach", label: "🎯 Coach / Consultant / Formateur" },
  { value: "artisan", label: "🔨 Artisan / Artisanat" },
  { value: "commerce", label: "🛍️ Commerce de détail / Boutique" },
  { value: "autre", label: "🏢 Autre business" },
];

export default function AddProspectForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (!formData.get("businessName")) {
      setError("Le nom du business est requis");
      return;
    }
    if (!formData.get("businessType")) {
      setError("Le type de business est requis");
      return;
    }

    setError(null);
    startTransition(async () => {
      const prospect = await createProspect(formData);
      router.push(`/prospecting/${prospect.id}`);
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-gray-600 text-sm mb-3 flex items-center gap-1"
          >
            ← Retour
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Ajouter un prospect
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Renseignez les informations du business à prospecter. L&apos;IA analysera
            ensuite le lead et générera un email personnalisé.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Business info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              🏢 Informations du business
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du business <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="businessName"
                  required
                  placeholder="Ex: Boulangerie Martin, Plomberie Dupont..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de business <span className="text-red-500">*</span>
                </label>
                <select
                  name="businessType"
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Sélectionnez un type...</option>
                  {BUSINESS_TYPES.map((bt) => (
                    <option key={bt.value} value={bt.value}>
                      {bt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ville
                  </label>
                  <input
                    type="text"
                    name="city"
                    placeholder="Ex: Paris, Lyon..."
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pays
                  </label>
                  <input
                    type="text"
                    name="country"
                    defaultValue="France"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site web actuel
                </label>
                <input
                  type="url"
                  name="website"
                  placeholder="https://... (laissez vide si absent)"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">
                  💡 Les prospects sans site web ont généralement un score plus élevé
                </p>
              </div>
            </div>
          </div>

          {/* Contact info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              👤 Informations de contact{" "}
              <span className="text-gray-400 font-normal text-sm">
                (optionnel)
              </span>
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du contact
                </label>
                <input
                  type="text"
                  name="contactName"
                  placeholder="Ex: Jean Dupont"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="contact@business.fr"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="06 XX XX XX XX"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              📝 Notes{" "}
              <span className="text-gray-400 font-normal text-sm">
                (optionnel — enrichit l&apos;analyse IA)
              </span>
            </h2>
            <textarea
              name="notes"
              placeholder="Ex: Vu sur Google Maps, peu de présence en ligne, concurrent direct a un bon site... Ces informations aident l'IA à mieux analyser ce prospect."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm"
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⟳</span> Ajout en cours...
              </span>
            ) : (
              "Ajouter le prospect →"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
