"use client";

import { useState } from "react";

interface Place {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  totalRatings: number;
  photoRef: string | null;
  photoCount: number;
  openNow: boolean | null;
  priceLevel: number | null;
}

interface PlacePhoto {
  ref: string;
  width: number;
  height: number;
}

export interface PickedPhoto {
  url: string;  // proxy URL for canvas/display
  ref: string;  // photo_reference
}

export interface PlacePick {
  placeName: string;
  placeId: string;
  address: string;
  rating: number | null;
  photos: PickedPhoto[];  // one per slide
}

function photoUrl(ref: string, maxw = 400) {
  return `/api/places/photo?ref=${encodeURIComponent(ref)}&maxw=${maxw}`;
}

const CHIPS = [
  "restaurant rooftop Paris",
  "club nuit Paris",
  "restaurant gastronomique Paris",
  "bar cocktails Marais",
  "terrasse Paris",
  "brasserie luxe Paris",
];

export default function GooglePlacesPicker({
  onPick,
}: {
  onPick: (pick: PlacePick) => void;
}) {
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [photos, setPhotos] = useState<PlacePhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [selectedRefs, setSelectedRefs] = useState<Set<string>>(new Set());

  async function search(q: string) {
    if (!q.trim()) return;
    setSearching(true);
    setError(null);
    setPlaces([]);
    setSelectedPlace(null);
    setPhotos([]);
    setSelectedRefs(new Set());
    try {
      const res = await fetch(`/api/places/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.error === "no_key") {
        setError("Clé API Google manquante → ajoute GOOGLE_PLACES_API_KEY dans Railway (Variables).");
      } else if (data.error) {
        setError(`Erreur Google : ${data.error}`);
      } else {
        setPlaces(data.places ?? []);
        if (!data.places?.length) setError("Aucun résultat. Essaie un autre nom.");
      }
    } catch { setError("Erreur réseau."); }
    setSearching(false);
  }

  async function openPlace(place: Place) {
    setSelectedPlace(place);
    setPhotos([]);
    setSelectedRefs(new Set());
    setLoadingPhotos(true);
    try {
      const res = await fetch(`/api/places/photos?id=${place.id}`);
      const data = await res.json();
      const fetched: PlacePhoto[] = data.photos ?? [];
      setPhotos(fetched);
      // Auto-select first 5 photos
      setSelectedRefs(new Set(fetched.slice(0, 5).map((p: PlacePhoto) => p.ref)));
    } catch {}
    setLoadingPhotos(false);
  }

  function togglePhoto(ref: string) {
    setSelectedRefs(prev => {
      const next = new Set(prev);
      if (next.has(ref)) { next.delete(ref); } else { next.add(ref); }
      return next;
    });
  }

  function applySelection() {
    if (!selectedPlace || selectedRefs.size === 0) return;
    const ordered = photos.filter(p => selectedRefs.has(p.ref));
    onPick({
      placeName: selectedPlace.name,
      placeId: selectedPlace.id,
      address: selectedPlace.address,
      rating: selectedPlace.rating,
      photos: ordered.map(p => ({ ref: p.ref, url: photoUrl(p.ref, 1080) })),
    });
  }

  return (
    <div>
      {/* Search bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search(query)}
          placeholder="Nom du restaurant ou quartier…"
          style={{
            flex: 1, padding: "10px 14px",
            background: "#09090b", border: "1px solid #3f3f46",
            borderRadius: 8, color: "white", fontSize: 13, outline: "none",
          }}
        />
        <button
          onClick={() => search(query)}
          disabled={searching || !query.trim()}
          style={{
            padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700,
            background: searching || !query.trim() ? "#27272a" : "#10b981",
            color: searching || !query.trim() ? "#52525b" : "white",
            border: "none", cursor: searching || !query.trim() ? "default" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {searching ? "⏳" : "Chercher"}
        </button>
      </div>

      {/* Chips */}
      {!selectedPlace && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
          {CHIPS.map(q => (
            <button key={q} onClick={() => { setQuery(q); search(q); }} style={{
              padding: "3px 10px", borderRadius: 20, fontSize: 11,
              background: "#09090b", border: "1px solid #27272a",
              color: "#71717a", cursor: "pointer",
            }}>{q}</button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
          borderRadius: 8, padding: "10px 14px", color: "#f87171",
          fontSize: 12, marginBottom: 12, lineHeight: 1.5,
        }}>{error}</div>
      )}

      {/* Empty state */}
      {!places.length && !searching && !error && !selectedPlace && (
        <div style={{
          textAlign: "center", padding: "28px 16px",
          background: "#09090b", borderRadius: 10, border: "1px solid #27272a",
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🗺️</div>
          <div style={{ color: "#71717a", fontSize: 13 }}>Cherche un restaurant parisien</div>
          <div style={{ color: "#3f3f46", fontSize: 11, marginTop: 4 }}>
            Résultats Google Maps · photos du profil Google
          </div>
        </div>
      )}

      {/* Places list */}
      {places.length > 0 && !selectedPlace && (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ color: "#52525b", fontSize: 11, marginBottom: 2 }}>
            {places.length} résultats — clique pour voir les photos
          </div>
          {places.map(p => (
            <button key={p.id} onClick={() => openPlace(p)} style={{
              background: "#09090b", border: "1px solid #27272a", borderRadius: 10,
              padding: "11px 13px", cursor: "pointer", textAlign: "left",
              display: "flex", alignItems: "center", gap: 11,
              transition: "border-color 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "#3f3f46")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#27272a")}
            >
              {/* Thumbnail */}
              <div style={{
                width: 56, height: 56, borderRadius: 8, flexShrink: 0,
                overflow: "hidden", background: "#1a1a1d",
              }}>
                {p.photoRef ? (
                  <img src={photoUrl(p.photoRef, 120)} alt={p.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#7c3aed,#db2777)" }} />
                )}
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "white", fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                <div style={{ color: "#52525b", fontSize: 10, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.address}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                  {p.rating && <span style={{ color: "#f59e0b", fontSize: 11 }}>★ {p.rating.toFixed(1)}</span>}
                  {p.priceLevel ? <span style={{ color: "#71717a", fontSize: 11 }}>{"€".repeat(p.priceLevel)}</span> : null}
                  {p.photoCount > 0 && <span style={{ color: "#52525b", fontSize: 11 }}>📷 {p.photoCount} photos</span>}
                </div>
              </div>
              <div style={{ color: "#3f3f46", fontSize: 18 }}>›</div>
            </button>
          ))}
        </div>
      )}

      {/* Place photos */}
      {selectedPlace && (
        <div>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <button onClick={() => { setSelectedPlace(null); setPhotos([]); setSelectedRefs(new Set()); }} style={{
              background: "#09090b", border: "1px solid #27272a", borderRadius: 7,
              padding: "5px 11px", color: "#a1a1aa", fontSize: 12, cursor: "pointer",
            }}>← Retour</button>
            <div style={{ flex: 1 }}>
              <div style={{ color: "white", fontWeight: 700, fontSize: 13 }}>{selectedPlace.name}</div>
              <div style={{ color: "#52525b", fontSize: 11 }}>
                {loadingPhotos ? "Chargement…" : `${photos.length} photos · ${selectedRefs.size} sélectionnée(s)`}
              </div>
            </div>
          </div>

          {loadingPhotos && (
            <div style={{ textAlign: "center", padding: "20px", color: "#52525b", fontSize: 13 }}>
              ⏳ Récupération des photos Google Maps…
            </div>
          )}

          {!loadingPhotos && photos.length === 0 && (
            <div style={{ textAlign: "center", padding: "16px", color: "#52525b", fontSize: 13 }}>
              Aucune photo disponible pour ce lieu.
            </div>
          )}

          {photos.length > 0 && (
            <>
              <div style={{ color: "#71717a", fontSize: 11, marginBottom: 8 }}>
                Sélectionne les photos (1 par slide) puis clique Créer le carrousel
              </div>

              {/* Photo grid */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                gap: 6, marginBottom: 12,
              }}>
                {photos.map((photo, idx) => {
                  const sel = selectedRefs.has(photo.ref);
                  return (
                    <button key={photo.ref} onClick={() => togglePhoto(photo.ref)} style={{
                      padding: 0, border: `2px solid ${sel ? "#10b981" : "transparent"}`,
                      borderRadius: 9, overflow: "hidden", cursor: "pointer",
                      background: "#09090b", position: "relative",
                    }}>
                      <div style={{ position: "relative", paddingBottom: "100%", overflow: "hidden" }}>
                        <div style={{ position: "absolute", inset: 0 }}>
                          <img src={photoUrl(photo.ref, 200)} alt="" loading="lazy"
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          {sel && (
                            <div style={{
                              position: "absolute", inset: 0,
                              background: "rgba(16,185,129,0.35)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              <div style={{
                                width: 24, height: 24, borderRadius: "50%",
                                background: "#10b981",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                color: "white", fontSize: 13, fontWeight: 700,
                              }}>
                                {Array.from(selectedRefs).indexOf(photo.ref) + 1}
                              </div>
                            </div>
                          )}
                          {!sel && (
                            <div style={{
                              position: "absolute", bottom: 4, right: 4,
                              color: "#52525b", fontSize: 9,
                              background: "rgba(0,0,0,0.5)", borderRadius: 4, padding: "1px 4px",
                            }}>
                              {idx + 1}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Apply button */}
              <button
                onClick={applySelection}
                disabled={selectedRefs.size === 0}
                style={{
                  width: "100%", padding: "12px", borderRadius: 9,
                  fontSize: 14, fontWeight: 700,
                  background: selectedRefs.size === 0
                    ? "#27272a"
                    : "linear-gradient(135deg,#10b981,#059669)",
                  color: selectedRefs.size === 0 ? "#52525b" : "white",
                  border: "none", cursor: selectedRefs.size === 0 ? "default" : "pointer",
                }}
              >
                {selectedRefs.size === 0
                  ? "Sélectionne au moins une photo"
                  : `✓ Créer le carrousel avec ${selectedRefs.size} slide${selectedRefs.size > 1 ? "s" : ""}`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
