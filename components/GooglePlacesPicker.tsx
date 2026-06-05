"use client";

import { useState, useRef } from "react";

interface Place {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  totalRatings: number;
  photoRef: string | null;
  photoCount: number;
  types: string[];
  openNow: boolean | null;
  priceLevel: number | null;
}

interface PlacePhoto {
  ref: string;
  width: number;
  height: number;
}

export interface PickedPhoto {
  // URL to display/canvas (via our proxy)
  url: string;
  // photo_reference (to regenerate URL server-side if needed)
  ref: string;
  placeName: string;
}

function placePhotoUrl(ref: string, maxw = 400) {
  return `/api/places/photo?ref=${encodeURIComponent(ref)}&maxw=${maxw}`;
}

function priceTag(level: number | null) {
  if (level === null) return "";
  return "€".repeat(level);
}

function stars(rating: number | null) {
  if (!rating) return "";
  return "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));
}

export default function GooglePlacesPicker({ onPick }: { onPick: (photo: PickedPhoto) => void }) {
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [placePhotos, setPlacePhotos] = useState<PlacePhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [pickedRef, setPickedRef] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function searchPlaces(q: string) {
    if (!q.trim()) return;
    setSearching(true);
    setSearchError(null);
    setPlaces([]);
    setSelectedPlace(null);
    setPlacePhotos([]);
    try {
      const res = await fetch(`/api/places/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.error === "no_key") {
        setSearchError("Clé API Google manquante — ajoute GOOGLE_PLACES_API_KEY dans Railway.");
      } else if (data.error) {
        setSearchError(`Erreur : ${data.error}`);
      } else {
        setPlaces(data.places ?? []);
        if ((data.places ?? []).length === 0) setSearchError("Aucun restaurant trouvé.");
      }
    } catch {
      setSearchError("Erreur réseau.");
    }
    setSearching(false);
  }

  async function openPlace(place: Place) {
    setSelectedPlace(place);
    setPlacePhotos([]);
    setLoadingPhotos(true);
    try {
      const res = await fetch(`/api/places/photos?id=${place.id}`);
      const data = await res.json();
      setPlacePhotos(data.photos ?? []);
    } catch {}
    setLoadingPhotos(false);
  }

  function pickPhoto(ref: string, placeName: string) {
    setPickedRef(ref);
    onPick({
      url: placePhotoUrl(ref, 1080),
      ref,
      placeName,
    });
  }

  return (
    <div>
      {/* Search bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && searchPlaces(query)}
          placeholder="Nom du restaurant, quartier… ex: Perchoir Marais"
          style={{
            flex: 1, padding: "10px 14px",
            background: "#09090b", border: "1px solid #3f3f46",
            borderRadius: 8, color: "white", fontSize: 13, outline: "none",
          }}
        />
        <button
          onClick={() => searchPlaces(query)}
          disabled={searching || !query.trim()}
          style={{
            padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700,
            background: searching || !query.trim() ? "#27272a" : "#10b981",
            color: searching || !query.trim() ? "#52525b" : "white",
            border: "none", cursor: searching || !query.trim() ? "default" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {searching ? "⏳" : "🗺 Chercher"}
        </button>
      </div>

      {/* Quick chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {["Rooftop Paris", "Club Paris nuit", "Restaurant gastronomique Paris", "Bar cocktails Marais", "Terrasse Montmartre"].map(q => (
          <button key={q} onClick={() => { setQuery(q); searchPlaces(q); }} style={{
            padding: "4px 12px", borderRadius: 20, fontSize: 11,
            background: "#09090b", border: "1px solid #27272a", color: "#71717a", cursor: "pointer",
          }}>{q}</button>
        ))}
      </div>

      {/* Error */}
      {searchError && (
        <div style={{
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
          borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 12, marginBottom: 12,
        }}>{searchError}</div>
      )}

      {/* Places list */}
      {places.length > 0 && !selectedPlace && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ color: "#52525b", fontSize: 11, marginBottom: 4 }}>
            {places.length} restaurants trouvés — clique pour voir les photos
          </div>
          {places.map(place => (
            <button key={place.id} onClick={() => openPlace(place)} style={{
              background: "#09090b", border: "1px solid #27272a",
              borderRadius: 10, padding: "12px 14px", cursor: "pointer",
              textAlign: "left", display: "flex", gap: 12, alignItems: "center",
              transition: "border-color 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "#3f3f46")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#27272a")}
            >
              {/* Thumbnail */}
              <div style={{
                width: 60, height: 60, borderRadius: 8, flexShrink: 0, overflow: "hidden",
                background: "linear-gradient(135deg,#7c3aed,#db2777)",
              }}>
                {place.photoRef && (
                  <img
                    src={placePhotoUrl(place.photoRef, 120)}
                    alt={place.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                )}
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "white", fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{place.name}</div>
                <div style={{ color: "#71717a", fontSize: 11, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {place.address}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {place.rating && (
                    <span style={{ color: "#f59e0b", fontSize: 11 }}>
                      ★ {place.rating.toFixed(1)} ({place.totalRatings.toLocaleString()})
                    </span>
                  )}
                  {place.priceLevel && (
                    <span style={{ color: "#71717a", fontSize: 11 }}>{priceTag(place.priceLevel)}</span>
                  )}
                  {place.photoCount > 0 && (
                    <span style={{ color: "#52525b", fontSize: 11 }}>📷 {place.photoCount} photos</span>
                  )}
                  {place.openNow !== null && (
                    <span style={{ color: place.openNow ? "#10b981" : "#ef4444", fontSize: 11 }}>
                      {place.openNow ? "● Ouvert" : "● Fermé"}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ color: "#52525b", fontSize: 18, flexShrink: 0 }}>›</div>
            </button>
          ))}
        </div>
      )}

      {/* Place photos */}
      {selectedPlace && (
        <div>
          {/* Back button + place name */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <button onClick={() => { setSelectedPlace(null); setPlacePhotos([]); }} style={{
              background: "#09090b", border: "1px solid #27272a", borderRadius: 8,
              padding: "6px 12px", color: "#a1a1aa", fontSize: 12, cursor: "pointer",
            }}>← Retour</button>
            <div>
              <div style={{ color: "white", fontWeight: 700, fontSize: 14 }}>{selectedPlace.name}</div>
              <div style={{ color: "#71717a", fontSize: 11 }}>
                {loadingPhotos ? "Chargement des photos…" : `${placePhotos.length} photos disponibles`}
              </div>
            </div>
          </div>

          {loadingPhotos && (
            <div style={{ textAlign: "center", padding: "24px", color: "#52525b", fontSize: 13 }}>
              ⏳ Récupération des photos Google Maps…
            </div>
          )}

          {!loadingPhotos && placePhotos.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px", color: "#52525b", fontSize: 13 }}>
              Aucune photo disponible pour ce restaurant.
            </div>
          )}

          {placePhotos.length > 0 && (
            <>
              <div style={{ color: "#52525b", fontSize: 11, marginBottom: 10 }}>
                Clique sur une photo pour l'utiliser dans le carrousel
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                gap: 8,
              }}>
                {placePhotos.map(photo => {
                  const isSelected = pickedRef === photo.ref;
                  return (
                    <button key={photo.ref} onClick={() => pickPhoto(photo.ref, selectedPlace.name)} style={{
                      padding: 0, border: `2px solid ${isSelected ? "#10b981" : "transparent"}`,
                      borderRadius: 10, overflow: "hidden", cursor: "pointer",
                      background: "#09090b", transition: "border-color 0.15s",
                    }}>
                      <div style={{ position: "relative", paddingBottom: "100%", overflow: "hidden" }}>
                        <div style={{ position: "absolute", inset: 0 }}>
                          <img
                            src={placePhotoUrl(photo.ref, 300)}
                            alt=""
                            loading="lazy"
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          />
                          {isSelected && (
                            <div style={{
                              position: "absolute", inset: 0, background: "rgba(16,185,129,0.35)",
                              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
                            }}>✓</div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {places.length === 0 && !searching && !searchError && (
        <div style={{
          textAlign: "center", padding: "28px 16px",
          background: "#09090b", borderRadius: 10, border: "1px solid #27272a",
        }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>🗺️</div>
          <div style={{ color: "#52525b", fontSize: 13 }}>
            Recherche un vrai restaurant parisien
          </div>
          <div style={{ color: "#3f3f46", fontSize: 11, marginTop: 4 }}>
            Propulsé par Google Maps · nécessite GOOGLE_PLACES_API_KEY
          </div>
        </div>
      )}
    </div>
  );
}
