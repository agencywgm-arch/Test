"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrderStatus } from "@/lib/actions";
import Link from "next/link";

type OrderStatus = "PENDING" | "PREPARING" | "READY";

type Order = {
  id: string;
  number: number;
  customerName: string;
  status: OrderStatus;
  total: number;
  note?: string;
  createdAt: string;
  items: { name: string; quantity: number }[];
};

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; border: string; badge: string }> = {
  PENDING: { label: "En attente", bg: "bg-yellow-50", border: "border-yellow-200", badge: "bg-yellow-100 text-yellow-700" },
  PREPARING: { label: "En préparation", bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700" },
  READY: { label: "Prête", bg: "bg-green-50", border: "border-green-200", badge: "bg-green-100 text-green-700" },
};

const NEXT_STATUS: Record<OrderStatus, "PREPARING" | "READY" | "DONE"> = {
  PENDING: "PREPARING",
  PREPARING: "READY",
  READY: "DONE",
};

const NEXT_LABEL: Record<OrderStatus, string> = {
  PENDING: "Commencer",
  PREPARING: "Marquer prête",
  READY: "Récupérée ✓",
};

function timeSince(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  return `${Math.floor(diff / 60)}min`;
}

export default function KitchenClient({
  restaurant,
  initialOrders,
}: {
  restaurant: { name: string; slug: string; logoEmoji: string; primaryColor: string };
  initialOrders: Order[];
}) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [, startTransition] = useTransition();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  useEffect(() => {
    const refresh = setInterval(() => router.refresh(), 10000);
    const clock = setInterval(() => setTick((t) => t + 1), 30000);
    return () => { clearInterval(refresh); clearInterval(clock); };
  }, [router]);

  function advance(order: Order) {
    const next = NEXT_STATUS[order.status];
    startTransition(async () => {
      await updateOrderStatus(restaurant.slug, order.id, next);
      if (next === "DONE") {
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
      } else {
        setOrders((prev) =>
          prev.map((o) => o.id === order.id ? { ...o, status: next as OrderStatus } : o)
        );
      }
    });
  }

  const columns: OrderStatus[] = ["PENDING", "PREPARING", "READY"];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{restaurant.logoEmoji}</span>
          <div>
            <h1 className="font-bold text-lg">{restaurant.name}</h1>
            <p className="text-xs text-gray-400">Écran cuisine</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>{orders.length} commande{orders.length !== 1 ? "s" : ""} active{orders.length !== 1 ? "s" : ""}</span>
          <Link href={`/admin/${restaurant.slug}`} className="hover:text-white transition-colors">Admin →</Link>
        </div>
      </header>

      {/* Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 min-h-[calc(100vh-73px)]">
        {columns.map((status) => {
          const colOrders = orders.filter((o) => o.status === status);
          const cfg = STATUS_CONFIG[status];
          return (
            <div key={status} className="border-r border-gray-800 last:border-0">
              {/* Column header */}
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between bg-gray-800/40">
                <span className="font-semibold text-sm">{cfg.label}</span>
                <span className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-full font-medium">{colOrders.length}</span>
              </div>
              {/* Orders */}
              <div className="p-3 space-y-3">
                {colOrders.length === 0 && (
                  <p className="text-center text-gray-600 text-sm py-8">Aucune commande</p>
                )}
                {colOrders.map((order) => (
                  <div key={order.id} className={`${cfg.bg} ${cfg.border} border rounded-2xl p-4 text-gray-900`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-2xl font-extrabold" style={{ color: restaurant.primaryColor }}>#{order.number}</span>
                        <p className="text-sm font-semibold">{order.customerName}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${cfg.badge}`}>
                        {timeSince(order.createdAt)}
                      </span>
                    </div>
                    <ul className="space-y-1 mb-3">
                      {order.items.map((item, i) => (
                        <li key={i} className="text-sm flex gap-2">
                          <span className="font-bold text-gray-700">{item.quantity}×</span>
                          <span className="text-gray-700">{item.name}</span>
                        </li>
                      ))}
                    </ul>
                    {order.note && (
                      <div className="bg-yellow-100 border border-yellow-200 text-yellow-700 text-xs rounded-lg px-3 py-1.5 mb-3">
                        📝 {order.note}
                      </div>
                    )}
                    <button
                      onClick={() => advance(order)}
                      style={order.status === "READY" ? { backgroundColor: "#16a34a" } : { backgroundColor: restaurant.primaryColor }}
                      className="w-full py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-opacity"
                    >
                      {NEXT_LABEL[order.status]}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
