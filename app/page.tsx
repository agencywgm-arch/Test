import Link from "next/link";

const features = [
  { icon: "🛒", title: "Commande en ligne", desc: "Interface client intuitive avec panier, notes et suivi en temps réel." },
  { icon: "👨‍🍳", title: "Écran cuisine", desc: "Affichage live des commandes avec changement de statut en un clic." },
  { icon: "⚙️", title: "Back-office complet", desc: "Gérez votre menu, catégories, prix et disponibilités sans code." },
  { icon: "📱", title: "100% responsive", desc: "Fonctionne sur mobile, tablette et grand écran." },
  { icon: "⚡", title: "Ultra-rapide", desc: "Conçu pour les heures de rush — aucune latence, aucun plantage." },
  { icon: "🏪", title: "Multi-restaurant", desc: "Un restaurant = une URL. Déployez autant d'établissements que nécessaire." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <span className="text-xl font-bold text-red-500">🍔 QuickBite</span>
        <Link
          href="/burger-palace"
          className="text-sm font-medium text-gray-600 hover:text-red-500 transition-colors"
        >
          Voir la démo →
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <span className="inline-block bg-red-50 text-red-600 text-sm font-semibold px-4 py-1 rounded-full mb-6">
          SaaS restauration rapide
        </span>
        <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-6">
          Prenez les commandes.<br />
          <span className="text-red-500">Pas le stress.</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          QuickBite permet à votre restaurant de recevoir des commandes en ligne, de les afficher
          en cuisine et de les gérer depuis un back-office simple — sans aucune compétence technique.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/burger-palace"
            className="px-8 py-4 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-200"
          >
            Voir la démo client
          </Link>
          <Link
            href="/kitchen/burger-palace"
            className="px-8 py-4 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors"
          >
            Voir l&apos;écran cuisine
          </Link>
        </div>
        <p className="text-sm text-gray-400 mt-4">
          Démo : restaurant &quot;Burger Palace&quot; · Admin : <code className="bg-gray-100 px-1 rounded">admin123</code>
        </p>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-gray-50 rounded-2xl p-6 hover:shadow-md transition-shadow">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-gray-900 mb-1">{f.title}</h3>
              <p className="text-gray-500 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-900 text-white py-16 px-6 text-center">
        <h2 className="text-3xl font-bold mb-4">Prêt à démarrer ?</h2>
        <p className="text-gray-400 mb-8">Créez votre restaurant en 2 minutes.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/burger-palace" className="px-8 py-3 bg-red-500 rounded-xl font-semibold hover:bg-red-600 transition-colors">
            Commander (démo)
          </Link>
          <Link href="/admin/burger-palace/login" className="px-8 py-3 border border-gray-600 rounded-xl font-semibold hover:border-gray-400 transition-colors">
            Accès admin
          </Link>
        </div>
      </section>

      <footer className="text-center py-6 text-gray-400 text-sm">
        © 2025 QuickBite — SaaS commande restauration rapide
      </footer>
    </div>
  );
}
