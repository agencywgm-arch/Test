"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createCategory,
  deleteCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  logoutAdmin,
  updateRestaurantSettings,
  importMenuFromUrl,
  type ScrapedMenuItem,
} from "@/lib/actions";

type MenuItem = { id: string; name: string; description: string; price: number; emoji: string; available: boolean };
type Category = { id: string; name: string; menuItems: MenuItem[] };
type Restaurant = { id: string; name: string; slug: string; logoEmoji: string; primaryColor: string };

type Tab = "orders" | "menu" | "settings";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  PREPARING: "En préparation",
  READY: "Prête",
  DONE: "Récupérée",
};
const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PREPARING: "bg-blue-100 text-blue-700",
  READY: "bg-green-100 text-green-700",
  DONE: "bg-gray-100 text-gray-500",
};

export default function AdminDashboard({
  restaurant,
  categories: initialCategories,
  stats,
  recentOrders,
}: {
  restaurant: Restaurant;
  categories: Category[];
  stats: { todayOrders: number; todayRevenue: number; activeOrders: number };
  recentOrders: { id: string; number: number; customerName: string; status: string; total: number; createdAt: string; itemCount: number }[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("orders");
  const [categories, setCategories] = useState(initialCategories);
  const [, startTransition] = useTransition();

  // Menu editing state
  const [addingCategoryName, setAddingCategoryName] = useState("");
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [addingItemInCategory, setAddingItemInCategory] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({ name: "", description: "", price: "", emoji: "🍽️" });

  // Settings state
  const [settingsForm, setSettingsForm] = useState({ name: restaurant.name, logoEmoji: restaurant.logoEmoji, primaryColor: restaurant.primaryColor, password: "" });
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Firecrawl import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedItems, setImportedItems] = useState<ScrapedMenuItem[] | null>(null);
  const [selectedImportItems, setSelectedImportItems] = useState<Set<number>>(new Set());
  const [importTargetCategory, setImportTargetCategory] = useState<string>("");

  const color = restaurant.primaryColor;

  async function handleAddCategory() {
    if (!addingCategoryName.trim()) return;
    startTransition(async () => {
      const cat = await createCategory(restaurant.slug, addingCategoryName.trim());
      setCategories((prev) => [...prev, { ...cat, menuItems: [] }]);
      setAddingCategoryName("");
    });
  }

  async function handleDeleteCategory(catId: string) {
    if (!confirm("Supprimer cette catégorie et tous ses articles ?")) return;
    startTransition(async () => {
      await deleteCategory(restaurant.slug, catId);
      setCategories((prev) => prev.filter((c) => c.id !== catId));
    });
  }

  async function handleAddItem(categoryId: string) {
    if (!itemForm.name.trim() || !itemForm.price) return;
    startTransition(async () => {
      const item = await createMenuItem(restaurant.slug, {
        name: itemForm.name.trim(),
        description: itemForm.description.trim() || undefined,
        price: parseFloat(itemForm.price),
        emoji: itemForm.emoji,
        categoryId,
      });
      setCategories((prev) =>
        prev.map((c) => c.id === categoryId ? { ...c, menuItems: [...c.menuItems, { ...item, description: item.description ?? "" }] } : c)
      );
      setAddingItemInCategory(null);
      setItemForm({ name: "", description: "", price: "", emoji: "🍽️" });
    });
  }

  async function handleToggleAvailable(item: MenuItem) {
    startTransition(async () => {
      await updateMenuItem(restaurant.slug, item.id, { available: !item.available });
      setCategories((prev) =>
        prev.map((c) => ({ ...c, menuItems: c.menuItems.map((m) => m.id === item.id ? { ...m, available: !m.available } : m) }))
      );
    });
  }

  async function handleDeleteItem(catId: string, itemId: string) {
    if (!confirm("Supprimer cet article ?")) return;
    startTransition(async () => {
      await deleteMenuItem(restaurant.slug, itemId);
      setCategories((prev) =>
        prev.map((c) => c.id === catId ? { ...c, menuItems: c.menuItems.filter((m) => m.id !== itemId) } : c)
      );
    });
  }

  async function handleSaveSettings() {
    startTransition(async () => {
      await updateRestaurantSettings(restaurant.slug, settingsForm);
      setSettingsSaved(true);
      setTimeout(() => { setSettingsSaved(false); router.refresh(); }, 2000);
    });
  }

  async function handleLogout() {
    await logoutAdmin(restaurant.slug);
    router.push(`/admin/${restaurant.slug}/login`);
  }

  function openImportModal() {
    setShowImportModal(true);
    setImportUrl("");
    setImportError(null);
    setImportedItems(null);
    setSelectedImportItems(new Set());
    setImportTargetCategory(categories[0]?.id ?? "");
  }

  async function handleScrape() {
    if (!importUrl.trim()) return;
    setImportLoading(true);
    setImportError(null);
    setImportedItems(null);
    const result = await importMenuFromUrl(restaurant.slug, importUrl.trim());
    setImportLoading(false);
    if (result.error) {
      setImportError(result.error);
    } else {
      const items = result.items ?? [];
      setImportedItems(items);
      setSelectedImportItems(new Set(items.map((_, i) => i)));
    }
  }

  async function handleConfirmImport() {
    if (!importedItems || selectedImportItems.size === 0) return;
    const toImport = importedItems.filter((_, i) => selectedImportItems.has(i));
    startTransition(async () => {
      let targetCategoryId = importTargetCategory;

      // Group by category name and create categories if needed
      const byCategoryName = new Map<string, ScrapedMenuItem[]>();
      for (const item of toImport) {
        const list = byCategoryName.get(item.category) ?? [];
        list.push(item);
        byCategoryName.set(item.category, list);
      }

      const useAutoCategories = importTargetCategory === "__auto__";

      for (const [categoryName, items] of Array.from(byCategoryName.entries())) {
        if (useAutoCategories) {
          const existing = categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
          if (existing) {
            targetCategoryId = existing.id;
          } else {
            const newCat = await createCategory(restaurant.slug, categoryName);
            setCategories((prev) => [...prev, { ...newCat, menuItems: [] }]);
            targetCategoryId = newCat.id;
          }
        }

        for (const item of items) {
          const created = await createMenuItem(restaurant.slug, {
            name: item.name,
            description: item.description || undefined,
            price: item.price,
            emoji: item.emoji,
            categoryId: useAutoCategories ? targetCategoryId : importTargetCategory,
          });
          setCategories((prev) =>
            prev.map((c) =>
              c.id === (useAutoCategories ? targetCategoryId : importTargetCategory)
                ? { ...c, menuItems: [...c.menuItems, { ...created, description: created.description ?? "" }] }
                : c
            )
          );
        }
      }

      setShowImportModal(false);
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{restaurant.logoEmoji}</span>
          <div>
            <h1 className="font-bold text-gray-900">{restaurant.name}</h1>
            <p className="text-xs text-gray-400">Administration</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/${restaurant.slug}`} target="_blank" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            Menu ↗
          </Link>
          <Link href={`/kitchen/${restaurant.slug}`} target="_blank" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            Cuisine ↗
          </Link>
          <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700 transition-colors">
            Déconnexion
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-6 flex gap-6">
        {(["orders", "menu", "settings"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-current" : "border-transparent text-gray-400 hover:text-gray-600"}`}
            style={tab === t ? { color, borderColor: color } : {}}
          >
            {{ orders: "📋 Commandes", menu: "🍽️ Menu", settings: "⚙️ Paramètres" }[t]}
          </button>
        ))}
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* ─── Orders tab ─────────────────────────────────────────── */}
        {tab === "orders" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: "Commandes aujourd'hui", value: stats.todayOrders },
                { label: "CA aujourd'hui", value: `${stats.todayRevenue.toFixed(2)} €` },
                { label: "Commandes actives", value: stats.activeOrders },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm text-center">
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
            {/* Recent orders */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">Commandes récentes</h2>
                <Link href={`/kitchen/${restaurant.slug}`} style={{ color }} className="text-sm font-medium hover:opacity-80">
                  Écran cuisine →
                </Link>
              </div>
              {recentOrders.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-10">Aucune commande pour l&apos;instant</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {recentOrders.map((o) => (
                    <div key={o.id} className="px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-gray-900 w-8">#{o.number}</span>
                        <div>
                          <p className="font-medium text-sm">{o.customerName}</p>
                          <p className="text-xs text-gray-400">{o.itemCount} article{o.itemCount !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-medium text-sm">{o.total.toFixed(2)} €</span>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[o.status]}`}>
                          {STATUS_LABELS[o.status]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ─── Menu tab ────────────────────────────────────────────── */}
        {tab === "menu" && (
          <div className="space-y-6">
            {/* Add category + import */}
            <div className="flex gap-3">
              <input
                type="text"
                value={addingCategoryName}
                onChange={(e) => setAddingCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                placeholder="Nouvelle catégorie…"
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": color } as React.CSSProperties}
              />
              <button
                onClick={handleAddCategory}
                style={{ backgroundColor: color }}
                className="px-5 py-2.5 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                + Catégorie
              </button>
              <button
                onClick={openImportModal}
                className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                🔗 Importer depuis URL
              </button>
            </div>

            {categories.map((cat) => (
              <div key={cat.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between bg-gray-50">
                  <h2 className="font-semibold text-gray-800">{cat.name}</h2>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setAddingItemInCategory(cat.id); setItemForm({ name: "", description: "", price: "", emoji: "🍽️" }); }}
                      style={{ color }}
                      className="text-sm font-medium hover:opacity-80"
                    >
                      + Article
                    </button>
                    <button onClick={() => handleDeleteCategory(cat.id)} className="text-sm text-red-400 hover:text-red-600">Supprimer</button>
                  </div>
                </div>

                {/* Add item form */}
                {addingItemInCategory === cat.id && (
                  <div className="px-5 py-4 bg-blue-50 border-b border-blue-100">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <input value={itemForm.emoji} onChange={(e) => setItemForm({ ...itemForm, emoji: e.target.value })} placeholder="Emoji" className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" style={{ width: "80px" }} />
                      <input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} placeholder="Nom *" className="col-span-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none flex-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <input value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} placeholder="Description (optionnel)" className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                      <input type="number" step="0.01" min="0" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} placeholder="Prix (€) *" className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleAddItem(cat.id)} style={{ backgroundColor: color }} className="px-4 py-2 text-white rounded-xl text-sm font-semibold hover:opacity-90">Ajouter</button>
                      <button onClick={() => setAddingItemInCategory(null)} className="px-4 py-2 bg-gray-100 rounded-xl text-sm text-gray-600 hover:bg-gray-200">Annuler</button>
                    </div>
                  </div>
                )}

                {/* Items */}
                {cat.menuItems.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">Aucun article</p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {cat.menuItems.map((item) => (
                      <div key={item.id} className={`px-5 py-3 flex items-center gap-4 ${!item.available ? "opacity-50" : ""}`}>
                        <span className="text-2xl">{item.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{item.name}</p>
                          {item.description && <p className="text-xs text-gray-400 truncate">{item.description}</p>}
                        </div>
                        <span className="font-bold text-sm" style={{ color }}>{item.price.toFixed(2)} €</span>
                        <div className="flex gap-3 text-sm">
                          <button
                            onClick={() => handleToggleAvailable(item)}
                            className={`font-medium ${item.available ? "text-gray-400 hover:text-gray-600" : "text-green-500 hover:text-green-700"}`}
                          >
                            {item.available ? "Désactiver" : "Activer"}
                          </button>
                          <button onClick={() => handleDeleteItem(cat.id, item.id)} className="text-red-400 hover:text-red-600">Supprimer</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ─── Settings tab ────────────────────────────────────────── */}
        {tab === "settings" && (
          <div className="bg-white rounded-2xl shadow-sm p-6 max-w-lg space-y-5">
            <h2 className="font-bold text-gray-900 text-lg mb-2">Paramètres du restaurant</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du restaurant</label>
              <input value={settingsForm.name} onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Emoji logo</label>
              <input value={settingsForm.logoEmoji} onChange={(e) => setSettingsForm({ ...settingsForm, logoEmoji: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Couleur principale</label>
              <div className="flex items-center gap-3">
                <input type="color" value={settingsForm.primaryColor} onChange={(e) => setSettingsForm({ ...settingsForm, primaryColor: e.target.value })} className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                <span className="text-sm text-gray-500 font-mono">{settingsForm.primaryColor}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe (laisser vide pour ne pas changer)</label>
              <input type="password" value={settingsForm.password} onChange={(e) => setSettingsForm({ ...settingsForm, password: e.target.value })} placeholder="••••••••" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
            </div>
            <button
              onClick={handleSaveSettings}
              style={{ backgroundColor: color }}
              className="w-full py-3 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity"
            >
              {settingsSaved ? "✓ Enregistré !" : "Enregistrer"}
            </button>
          </div>
        )}
      </main>

      {/* ─── Firecrawl Import Modal ───────────────────────────────────────── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-lg">🔗 Importer un menu depuis une URL</h2>
              <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
              {/* URL input */}
              {!importedItems && (
                <>
                  <p className="text-sm text-gray-500">
                    Collez l&apos;URL d&apos;une page de menu restaurant. Firecrawl va scraper et extraire automatiquement les articles.
                  </p>
                  <div className="flex gap-3">
                    <input
                      type="url"
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !importLoading && handleScrape()}
                      placeholder="https://restaurant.com/menu"
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
                    />
                    <button
                      onClick={handleScrape}
                      disabled={importLoading || !importUrl.trim()}
                      style={{ backgroundColor: color }}
                      className="px-5 py-2.5 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {importLoading ? "Analyse…" : "Scraper"}
                    </button>
                  </div>
                  {importLoading && (
                    <p className="text-sm text-gray-400 text-center py-4">Analyse de la page en cours, cela peut prendre quelques secondes…</p>
                  )}
                  {importError && (
                    <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{importError}</div>
                  )}
                </>
              )}

              {/* Results */}
              {importedItems && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">
                      {importedItems.length} article{importedItems.length !== 1 ? "s" : ""} trouvé{importedItems.length !== 1 ? "s" : ""}
                      {" — "}
                      <button onClick={() => setImportedItems(null)} className="text-blue-500 hover:underline">modifier l&apos;URL</button>
                    </p>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedImportItems.size === importedItems.length}
                        onChange={(e) =>
                          setSelectedImportItems(
                            e.target.checked ? new Set(importedItems.map((_, i) => i)) : new Set()
                          )
                        }
                      />
                      Tout sélectionner
                    </label>
                  </div>

                  {/* Category target */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Importer dans</label>
                    <select
                      value={importTargetCategory}
                      onChange={(e) => setImportTargetCategory(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                    >
                      <option value="__auto__">Créer les catégories automatiquement</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    {importedItems.map((item, i) => (
                      <label
                        key={i}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          selectedImportItems.has(i) ? "border-blue-200 bg-blue-50" : "border-gray-100 bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedImportItems.has(i)}
                          onChange={(e) => {
                            const next = new Set(selectedImportItems);
                            e.target.checked ? next.add(i) : next.delete(i);
                            setSelectedImportItems(next);
                          }}
                          className="w-4 h-4 flex-shrink-0"
                        />
                        <span className="text-2xl">{item.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900">{item.name}</p>
                          {item.description && <p className="text-xs text-gray-400 truncate">{item.description}</p>}
                          <p className="text-xs text-gray-400">{item.category}</p>
                        </div>
                        <span className="font-bold text-sm" style={{ color }}>{item.price.toFixed(2)} €</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>

            {importedItems && (
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                <button onClick={() => setShowImportModal(false)} className="px-5 py-2.5 bg-gray-100 rounded-xl text-sm text-gray-600 hover:bg-gray-200">
                  Annuler
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={selectedImportItems.size === 0}
                  style={{ backgroundColor: color }}
                  className="px-5 py-2.5 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Importer {selectedImportItems.size} article{selectedImportItems.size !== 1 ? "s" : ""}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
