"use client";

import { useState, useRef } from "react";
import { createOrder } from "@/lib/actions";
import { useRouter } from "next/navigation";

type MenuItem = { id: string; name: string; description?: string; price: number; emoji: string };
type Category = { id: string; name: string; menuItems: MenuItem[] };
type Restaurant = { id: string; name: string; slug: string; logoEmoji: string; primaryColor: string };
type CartItem = MenuItem & { quantity: number };

export default function MenuClient({ restaurant, categories }: { restaurant: Restaurant; categories: Category[] }) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [note, setNote] = useState("");
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? "");
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = cart.reduce((s, i) => s + i.quantity, 0);

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) return prev.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  }

  function removeFromCart(id: string) {
    setCart((prev) => {
      const item = prev.find((i) => i.id === id);
      if (!item) return prev;
      if (item.quantity === 1) return prev.filter((i) => i.id !== id);
      return prev.map((i) => i.id === id ? { ...i, quantity: i.quantity - 1 } : i);
    });
  }

  function scrollToCategory(catId: string) {
    setActiveCategory(catId);
    categoryRefs.current[catId]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submitOrder() {
    if (!customerName.trim()) return;
    setOrdering(true);
    try {
      const order = await createOrder(
        restaurant.slug,
        customerName.trim(),
        cart.map((i) => ({ menuItemId: i.id, quantity: i.quantity })),
        note.trim() || undefined
      );
      router.push(`/${restaurant.slug}/order/${order.id}`);
    } catch (e) {
      alert("Erreur lors de la commande. Réessayez.");
      setOrdering(false);
    }
  }

  const color = restaurant.primaryColor;

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{restaurant.logoEmoji}</span>
          <div>
            <h1 className="font-bold text-gray-900 text-lg leading-tight">{restaurant.name}</h1>
            <p className="text-xs text-gray-400">Commande en ligne</p>
          </div>
        </div>
        <button
          onClick={() => setCartOpen(true)}
          style={{ backgroundColor: color }}
          className="relative flex items-center gap-2 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
        >
          🛒 Panier
          {count > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-gray-900 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {count}
            </span>
          )}
        </button>
      </header>

      {/* Category tabs */}
      <div className="sticky top-[61px] z-20 bg-white border-b border-gray-100 px-4 flex gap-2 overflow-x-auto scrollbar-hide py-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => scrollToCategory(cat.id)}
            style={activeCategory === cat.id ? { backgroundColor: color, color: "white" } : {}}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat.id ? "" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Menu */}
      <main className="max-w-2xl mx-auto px-4 pt-4">
        {categories.map((cat) => (
          <section
            key={cat.id}
            ref={(el) => { categoryRefs.current[cat.id] = el; }}
            className="mb-8 scroll-mt-28"
          >
            <h2 className="text-lg font-bold text-gray-800 mb-3">{cat.name}</h2>
            <div className="grid gap-3">
              {cat.menuItems.map((item) => {
                const qty = cart.find((i) => i.id === item.id)?.quantity ?? 0;
                return (
                  <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
                    <span className="text-4xl">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      {item.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{item.description}</p>}
                      <p className="font-bold mt-1" style={{ color }}>{item.price.toFixed(2)} €</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {qty > 0 ? (
                        <>
                          <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 rounded-full bg-gray-100 font-bold text-gray-700 hover:bg-gray-200 transition-colors flex items-center justify-center">−</button>
                          <span className="w-5 text-center font-bold">{qty}</span>
                        </>
                      ) : null}
                      <button
                        onClick={() => addToCart(item)}
                        style={{ backgroundColor: color }}
                        className="w-8 h-8 rounded-full text-white font-bold hover:opacity-90 transition-opacity flex items-center justify-center"
                      >+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      {/* Cart button bottom bar */}
      {count > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-20">
          <button
            onClick={() => setCartOpen(true)}
            style={{ backgroundColor: color }}
            className="w-full max-w-2xl mx-auto flex items-center justify-between text-white px-6 py-4 rounded-2xl font-semibold shadow-lg hover:opacity-90 transition-opacity"
          >
            <span className="bg-white/20 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">{count}</span>
            <span>Voir mon panier</span>
            <span>{total.toFixed(2)} €</span>
          </button>
        </div>
      )}

      {/* Cart / Order Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !ordering && setCartOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold">Mon panier</h2>
                <button onClick={() => setCartOpen(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200">✕</button>
              </div>

              {cart.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Votre panier est vide</p>
              ) : (
                <>
                  <div className="space-y-3 mb-5">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <span className="text-2xl">{item.emoji}</span>
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-500">{(item.price * item.quantity).toFixed(2)} €</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-700 hover:bg-gray-200">−</button>
                          <span className="w-4 text-center font-bold text-sm">{item.quantity}</span>
                          <button onClick={() => addToCart(item)} style={{ backgroundColor: color }} className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold hover:opacity-90">+</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 mb-5">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>{total.toFixed(2)} €</span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Votre prénom *</label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Ex : Marie"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                        style={{ "--tw-ring-color": color } as React.CSSProperties}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Note (optionnel)</label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Ex : sans oignons, sauce à part..."
                        rows={2}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none resize-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={submitOrder}
                    disabled={!customerName.trim() || ordering}
                    style={{ backgroundColor: !customerName.trim() || ordering ? undefined : color }}
                    className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:bg-gray-300 hover:opacity-90 transition-opacity"
                  >
                    {ordering ? "Envoi en cours…" : `Commander — ${total.toFixed(2)} €`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
