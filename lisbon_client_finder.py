#!/usr/bin/env python3
"""
Lisbon Client Finder
Find potential web design clients in Lisbon using OpenStreetMap data.
No API key required — uses the free Overpass API.

Usage:
    python lisbon_client_finder.py
    python lisbon_client_finder.py --radius 3000 --categories restaurant cafe shop
    python lisbon_client_finder.py --no-website-only --output leads.csv
"""

import argparse
import csv
import json
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime

# Lisbon city center coordinates
LISBON_LAT = 38.7223
LISBON_LON = -9.1393

# Default search radius in meters
DEFAULT_RADIUS = 5000

# Business categories to target — sorted by website-creation potential
CATEGORY_MAP = {
    "restaurant":    "Restauration",
    "cafe":          "Café",
    "bar":           "Bar",
    "fast_food":     "Fast-food",
    "hotel":         "Hôtel",
    "guest_house":   "Pension / B&B",
    "beauty":        "Institut beauté",
    "hairdresser":   "Coiffeur",
    "bakery":        "Boulangerie",
    "butcher":       "Boucherie",
    "florist":       "Fleuriste",
    "clothes":       "Boutique vêtements",
    "shoes":         "Chaussures",
    "gift":          "Cadeaux / Souvenirs",
    "books":         "Librairie",
    "furniture":     "Meubles",
    "electronics":   "Électronique",
    "supermarket":   "Épicerie / Supermarché",
    "optician":      "Opticien",
    "dentist":       "Dentiste",
    "doctor":        "Médecin",
    "physiotherapist": "Kinésithérapeute",
    "gym":           "Salle de sport",
    "yoga":          "Yoga / Pilates",
    "lawyer":        "Avocat",
    "accountant":    "Comptable",
    "travel_agency": "Agence de voyage",
    "real_estate":   "Immobilier",
    "photographer":  "Photographe",
    "car_repair":    "Garage",
    "taxi":          "Taxi / VTC",
    "bicycle":       "Vélo / Location",
    "pet":           "Animalerie / Vétérinaire",
    "interior_decoration": "Décoration intérieure",
    "tailor":        "Couturier",
    "massage":       "Massage / Spa",
    "art":           "Galerie / Art",
    "music":         "Cours de musique",
}

OVERPASS_MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]


def build_overpass_query(lat: float, lon: float, radius: int, categories: list[str]) -> str:
    """Build an Overpass QL query to fetch nodes and ways for given amenity/shop tags."""
    amenity_cats = []
    shop_cats = []
    leisure_cats = []
    office_cats = []

    amenity_tags = {
        "restaurant", "cafe", "bar", "fast_food", "hotel", "guest_house",
        "dentist", "doctor", "physiotherapist", "gym", "taxi",
    }
    shop_tags = {
        "beauty", "hairdresser", "bakery", "butcher", "florist", "clothes",
        "shoes", "gift", "books", "furniture", "electronics", "supermarket",
        "optician", "bicycle", "pet", "interior_decoration", "tailor",
        "massage", "art", "music",
    }
    leisure_tags = {"yoga", "gym"}
    office_tags = {"lawyer", "accountant", "travel_agency", "real_estate", "photographer"}

    for cat in categories:
        if cat in amenity_tags:
            amenity_cats.append(cat)
        if cat in shop_tags:
            shop_cats.append(cat)
        if cat in leisure_tags:
            leisure_cats.append(cat)
        if cat in office_tags:
            office_tags_list = office_cats
            office_tags_list.append(cat)

    parts = []
    for cat in amenity_cats:
        parts.append(f'node["amenity"="{cat}"](around:{radius},{lat},{lon});')
    for cat in shop_cats:
        parts.append(f'node["shop"="{cat}"](around:{radius},{lat},{lon});')
    for cat in leisure_cats:
        parts.append(f'node["leisure"="{cat}"](around:{radius},{lat},{lon});')
    for cat in office_cats:
        parts.append(f'node["office"="{cat}"](around:{radius},{lat},{lon});')

    # Fallback: generic name-based search for any tagged business
    if not parts:
        parts.append(f'node["name"](around:{radius},{lat},{lon});')

    union = "\n  ".join(parts)
    return f"""[out:json][timeout:60];
(
  {union}
);
out body;"""


def fetch_overpass(query: str) -> list[dict]:
    """Send the query to Overpass API, trying each mirror in turn."""
    data = urllib.parse.urlencode({"data": query}).encode()
    last_error = None
    for mirror in OVERPASS_MIRRORS:
        req = urllib.request.Request(mirror, data=data)
        req.add_header("User-Agent", "LisbonClientFinder/1.0 (web-design prospecting tool)")
        try:
            with urllib.request.urlopen(req, timeout=90) as resp:
                result = json.loads(resp.read().decode())
                return result.get("elements", [])
        except urllib.error.HTTPError as e:
            last_error = f"HTTP {e.code} sur {mirror}"
            print(f"  [avertissement] {last_error}, essai du miroir suivant...")
        except urllib.error.URLError as e:
            last_error = f"URLError sur {mirror}: {e.reason}"
            print(f"  [avertissement] {last_error}, essai du miroir suivant...")
        time.sleep(1)
    print(f"[ERREUR] Tous les miroirs Overpass ont échoué. Dernier : {last_error}")
    print("  Vérifiez votre connexion internet et réessayez.")
    sys.exit(1)


def check_website_reachable(url: str) -> str:
    """Quick HEAD request to check if a website responds."""
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    try:
        req = urllib.request.Request(url, method="HEAD")
        req.add_header("User-Agent", "Mozilla/5.0")
        with urllib.request.urlopen(req, timeout=8) as resp:
            code = resp.status
            if code < 400:
                return "En ligne"
            return f"Erreur {code}"
    except Exception:
        return "Inaccessible"


def parse_business(element: dict) -> dict | None:
    """Extract relevant fields from an Overpass element."""
    tags = element.get("tags", {})
    name = tags.get("name") or tags.get("brand")
    if not name:
        return None

    cat_key = (
        tags.get("amenity")
        or tags.get("shop")
        or tags.get("leisure")
        or tags.get("office")
        or "autre"
    )
    category_fr = CATEGORY_MAP.get(cat_key, cat_key.replace("_", " ").capitalize())

    address_parts = filter(None, [
        tags.get("addr:housenumber"),
        tags.get("addr:street"),
        tags.get("addr:postcode"),
        tags.get("addr:city", "Lisboa"),
    ])
    address = " ".join(address_parts) or "—"

    phone = (
        tags.get("phone")
        or tags.get("contact:phone")
        or tags.get("mobile")
        or "—"
    )
    email = tags.get("email") or tags.get("contact:email") or "—"
    website = (
        tags.get("website")
        or tags.get("contact:website")
        or tags.get("url")
        or ""
    )
    facebook = tags.get("contact:facebook") or tags.get("facebook") or "—"
    instagram = tags.get("contact:instagram") or tags.get("instagram") or "—"
    opening_hours = tags.get("opening_hours") or "—"

    lat = element.get("lat", "")
    lon = element.get("lon", "")
    google_maps = (
        f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(name)}&center={lat},{lon}"
        if lat and lon else "—"
    )

    return {
        "Nom": name,
        "Catégorie": category_fr,
        "Adresse": address,
        "Téléphone": phone,
        "Email": email,
        "Site web": website or "AUCUN",
        "Facebook": facebook,
        "Instagram": instagram,
        "Horaires": opening_hours,
        "Google Maps": google_maps,
        "Statut site": "",
        "Note": "",
        "_has_website": bool(website),
        "_lat": lat,
        "_lon": lon,
    }


def prioritize(businesses: list[dict]) -> list[dict]:
    """Sort: no website first, then those with phone, then the rest."""
    def score(b):
        has_website = b["_has_website"]
        has_phone = b["Téléphone"] != "—"
        has_email = b["Email"] != "—"
        # Lower score = higher priority
        return (
            int(has_website),          # No website = 0, with website = 1
            -int(has_phone),           # Has phone = -1 (better), no phone = 0
            -int(has_email),
        )
    return sorted(businesses, key=score)


def export_csv(businesses: list[dict], filepath: str):
    """Write results to a CSV file."""
    if not businesses:
        print("Aucun résultat à exporter.")
        return

    fields = [
        "Nom", "Catégorie", "Adresse", "Téléphone", "Email",
        "Site web", "Statut site", "Facebook", "Instagram",
        "Horaires", "Google Maps", "Note",
    ]
    with open(filepath, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(businesses)
    print(f"\n  Fichier exporté : {filepath}")


def print_summary(businesses: list[dict]):
    """Print a quick stats summary to the console."""
    total = len(businesses)
    no_site = sum(1 for b in businesses if not b["_has_website"])
    has_phone = sum(1 for b in businesses if b["Téléphone"] != "—")
    has_email = sum(1 for b in businesses if b["Email"] != "—")

    by_cat: dict[str, int] = {}
    for b in businesses:
        by_cat[b["Catégorie"]] = by_cat.get(b["Catégorie"], 0) + 1

    print(f"\n{'='*55}")
    print("  RÉSUMÉ DES PROSPECTS")
    print(f"{'='*55}")
    print(f"  Total entreprises trouvées  : {total}")
    print(f"  Sans site web               : {no_site}  ← priorité haute")
    print(f"  Avec numéro de téléphone    : {has_phone}")
    print(f"  Avec adresse email          : {has_email}")
    print(f"\n  Top catégories :")
    for cat, count in sorted(by_cat.items(), key=lambda x: -x[1])[:10]:
        bar = "█" * min(count, 30)
        print(f"    {cat:<30} {bar} {count}")
    print(f"{'='*55}")


def main():
    parser = argparse.ArgumentParser(
        description="Trouve des clients potentiels à Lisbonne pour la création de site web.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples :
  python lisbon_client_finder.py
  python lisbon_client_finder.py --radius 3000 --no-website-only
  python lisbon_client_finder.py --categories restaurant cafe hotel --check-sites
  python lisbon_client_finder.py --output mes_prospects.csv --radius 8000
        """,
    )
    parser.add_argument(
        "--lat", type=float, default=LISBON_LAT,
        help=f"Latitude du point de départ (défaut: {LISBON_LAT} = Baixa Pombalina)",
    )
    parser.add_argument(
        "--lon", type=float, default=LISBON_LON,
        help=f"Longitude du point de départ (défaut: {LISBON_LON})",
    )
    parser.add_argument(
        "--radius", type=int, default=DEFAULT_RADIUS,
        help=f"Rayon de recherche en mètres (défaut: {DEFAULT_RADIUS})",
    )
    parser.add_argument(
        "--categories", nargs="+", default=list(CATEGORY_MAP.keys()),
        help="Catégories à chercher (défaut: toutes). Ex: restaurant cafe hotel",
    )
    parser.add_argument(
        "--no-website-only", action="store_true",
        help="N'afficher que les entreprises sans site web listé",
    )
    parser.add_argument(
        "--check-sites", action="store_true",
        help="Vérifier si les sites web existants sont accessibles (lent)",
    )
    parser.add_argument(
        "--output", type=str,
        default=f"prospects_lisbonne_{datetime.now().strftime('%Y%m%d_%H%M')}.csv",
        help="Nom du fichier CSV de sortie",
    )
    parser.add_argument(
        "--list-categories", action="store_true",
        help="Afficher toutes les catégories disponibles et quitter",
    )

    args = parser.parse_args()

    if args.list_categories:
        print("\nCatégories disponibles :")
        for key, label in CATEGORY_MAP.items():
            print(f"  {key:<30} → {label}")
        sys.exit(0)

    invalid = [c for c in args.categories if c not in CATEGORY_MAP]
    if invalid:
        print(f"[AVERTISSEMENT] Catégories inconnues ignorées : {', '.join(invalid)}")
        args.categories = [c for c in args.categories if c in CATEGORY_MAP]
        if not args.categories:
            print("[ERREUR] Aucune catégorie valide. Utilisez --list-categories pour voir les options.")
            sys.exit(1)

    print(f"\n  Lisbon Client Finder")
    print(f"  Centre de recherche : {args.lat}, {args.lon}")
    print(f"  Rayon               : {args.radius} m")
    print(f"  Catégories          : {len(args.categories)}")
    print(f"\n  Interrogation d'OpenStreetMap...")

    query = build_overpass_query(args.lat, args.lon, args.radius, args.categories)
    elements = fetch_overpass(query)
    print(f"  {len(elements)} éléments bruts récupérés.")

    businesses = []
    seen_names = set()
    for el in elements:
        b = parse_business(el)
        if b is None:
            continue
        key = (b["Nom"].lower(), b["Adresse"])
        if key in seen_names:
            continue
        seen_names.add(key)
        businesses.append(b)

    if args.no_website_only:
        businesses = [b for b in businesses if not b["_has_website"]]
        print(f"  Filtre appliqué : sans site web uniquement → {len(businesses)} entreprises")

    businesses = prioritize(businesses)

    if args.check_sites:
        to_check = [b for b in businesses if b["_has_website"]]
        print(f"\n  Vérification de {len(to_check)} sites web (peut prendre du temps)...")
        for i, b in enumerate(to_check, 1):
            status = check_website_reachable(b["Site web"])
            b["Statut site"] = status
            print(f"  [{i}/{len(to_check)}] {b['Nom'][:35]:<35} {status}")
            time.sleep(0.3)

    print_summary(businesses)
    export_csv(businesses, args.output)

    # Show top 10 no-website prospects on screen
    no_site_list = [b for b in businesses if not b["_has_website"]][:10]
    if no_site_list:
        print(f"\n  Top 10 prospects SANS site web :")
        print(f"  {'Nom':<30} {'Catégorie':<22} {'Téléphone'}")
        print(f"  {'-'*30} {'-'*22} {'-'*15}")
        for b in no_site_list:
            print(f"  {b['Nom'][:30]:<30} {b['Catégorie'][:22]:<22} {b['Téléphone']}")

    print(f"\n  Ouvre le fichier CSV dans Excel ou Google Sheets pour trier et filtrer.")
    print(f"  Bonne prospection !\n")


if __name__ == "__main__":
    main()
