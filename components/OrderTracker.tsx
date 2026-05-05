"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type OrderStatus = "PENDING" | "PREPARING" | "READY" | "DONE";

const STEPS: { key: OrderStatus; label: string; emoji: string; desc: string }[] = [
  { key: "PENDING", label: "Reçue", emoji: "📋", desc: "Votre commande a bien été enregistrée." },
  { key: "PREPARING", label: "En préparation", emoji: "👨‍🍳", desc: "La cuisine prépare votre commande." },
  { key: "READY", label: "Prête !", emoji: "🔔", desc: "Votre commande est prête à être récupérée !" },
  { key: "DONE", label: "Récupérée", emoji: "✅", desc: "Merci et à bientôt !" },
];

const ORDER_INDEX: Record<OrderStatus, number> = { PENDING: 0, PREPARING: 1, READY: 2, DONE: 3 };

type Props = {
  order: {
    id: string;
    number: number;
    customerName: string;
    status: OrderStatus;
    total: number;
    note?: string;
    createdAt: string;
    items: { name: string; quantity: number; price: number }[];
  };
  restaurant: { name: string; slug: string; logoEmoji: string; primaryColor: string };
};

export default function OrderTracker({ order: initialOrder, restaurant }: Props) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);

  useEffect(() => {
    if (order.status === "DONE") return;
    const interval = setInterval(() => router.refresh(), 8000);
    return () => clearInterval(interval);
  }, [order.status, router]);

  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  const currentIndex = ORDER_INDEX[order.status];
  const color = restaurant.primaryColor;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-4 py-3 flex items-center gap-3">
        <span className="text-3xl">{restaurant.logoEmoji}</span>
        <div>
          <h1 className="font-bold text-gray-900">{restaurant.name}</h1>
          <p className="text-xs text-gray-400">Suivi de commande</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        {/* Order number */}
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center mb-6">
          <p className="text-gray-500 text-sm mb-1">Commande de {order.customerName}</p>
          <div className="text-6xl font-extrabold mb-2" style={{ color }}>#{order.number}</div>
          <div className="inline-flex items-center gap-2 bg-gray-50 rounded-full px-4 py-2">
            <span className="text-xl">{STEPS[currentIndex].emoji}</span>
            <span className="font-semibold text-gray-800">{STEPS[currentIndex].label}</span>
          </div>
          <p className="text-gray-400 text-sm mt-2">{STEPS[currentIndex].desc}</p>
          {order.status !== "DONE" && (
            <p className="text-xs text-gray-300 mt-3 animate-pulse-slow">Mise à jour automatique toutes les 8s…</p>
          )}
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="relative">
            <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-100" />
            <div
              className="absolute top-4 left-4 h-0.5 transition-all duration-700"
              style={{ backgroundColor: color, width: currentIndex === 0 ? "0%" : `${(currentIndex / 3) * 100}%` }}
            />
            <div className="relative flex justify-between">
              {STEPS.map((step, i) => (
                <div key={step.key} className="flex flex-col items-center gap-2" style={{ width: "25%" }}>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold z-10 transition-colors duration-500"
                    style={{
                      backgroundColor: i <= currentIndex ? color : "#e5e7eb",
                      color: i <= currentIndex ? "white" : "#9ca3af",
                    }}
                  >
                    {i < currentIndex ? "✓" : i + 1}
                  </div>
                  <p className="text-xs text-center text-gray-500 leading-tight">{step.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Order summary */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-gray-800 mb-4">Récapitulatif</h2>
          <div className="space-y-2 mb-4">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.quantity}× {item.name}</span>
                <span className="font-medium">{(item.price * item.quantity).toFixed(2)} €</span>
              </div>
            ))}
          </div>
          {order.note && (
            <div className="bg-yellow-50 rounded-xl px-4 py-2 mb-4 text-sm text-yellow-700">
              📝 {order.note}
            </div>
          )}
          <div className="border-t pt-3 flex justify-between font-bold">
            <span>Total</span>
            <span>{order.total.toFixed(2)} €</span>
          </div>
        </div>

        <Link
          href={`/${restaurant.slug}`}
          className="block text-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← Retour au menu
        </Link>
      </main>
    </div>
  );
}
