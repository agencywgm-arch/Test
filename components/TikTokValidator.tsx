"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

// ── Types ────────────────────────────────────────────────────────────────────

interface ImageCandidate {
  url: string;
  thumbUrl: string;
  source: string;
  author: string;
}

interface SlideData {
  number: number;
  text: string;
  imageKeywords: string[];
  imageCandidates: ImageCandidate[];
  selectedImageUrl: string | null;
  selectedThumbUrl: string | null;
}

interface VerificationNotes {
  sources?: string[];
  lastVerifiedAt?: string;
  toVerify?: string[];
  priceRange?: string;
  hours?: string;
  cuisine?: string;
}

interface Post {
  id: string;
  status: string;
  restaurantName: string;
  address: string | null;
  createdAt: string;
  slides: SlideData[];
  caption: string | null;
  hashtags: string[];
  verificationNotes: VerificationNotes;
  finalAssets: { slideNum: number; url: string }[];
}

type Selection = Record<number, { url: string; thumbUrl: string }>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function slideLines(text: string): string[] {
  return text.replace(/\\n/g, "\n").split("\n");
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  awaiting_validation: { label: "À valider", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  validated:           { label: "Validé",    color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  composed:            { label: "Composé",   color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  delivered:           { label: "Livré",     color: "#71717a", bg: "rgba(113,113,122,0.12)" },
};

// ── Root component ───────────────────────────────────────────────────────────

export default function TikTokValidator({ initialPosts }: { initialPosts: Post[] }) {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, Selection>>({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const selectedPost = selectedId ? posts.find(p => p.id === selectedId) ?? null : null;
  const postSelections: Selection = selectedId ? (selections[selectedId] ?? {}) : {};
  const allSelected = selectedPost
    ? selectedPost.slides.every(s => postSelections[s.number])
    : false;

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/carousel/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "Erreur génération");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [router]);

  const handleSelectImage = useCallback(
    (postId: string, slideNum: number, url: string, thumbUrl: string) => {
      setSelections(prev => ({
        ...prev,
        [postId]: { ...(prev[postId] ?? {}), [slideNum]: { url, thumbUrl } },
      }));
    },
    []
  );

  const handleValidateAndCompose = useCallback(async () => {
    if (!selectedPost) return;
    setLoading(true);
    setError(null);
    try {
      const validateRes = await fetch(`/api/carousel/${selectedPost.id}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slideSelections: postSelections }),
      });
      const validateData = await validateRes.json();
      if (!validateRes.ok) throw new Error(validateData.error ?? "Erreur validation");

      const composeRes = await fetch(`/api/carousel/${selectedPost.id}/compose`, {
        method: "POST",
      });
      const composeData = await composeRes.json();
      if (!composeRes.ok) throw new Error(composeData.error ?? "Erreur composition");

      setPosts(prev =>
        prev.map(p => p.id === selectedPost.id ? { ...p, status: "composed" } : p)
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [selectedPost, postSelections]);

  const handleReject = useCallback(async () => {
    if (!selectedPost) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/carousel/${selectedPost.id}/reject`, { method: "POST" });
      if (!res.ok) throw new Error("Erreur rejet");
      setPosts(prev => prev.filter(p => p.id !== selectedPost.id));
      setSelectedId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [selectedPost]);

  const handleCopy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);

  // ── Deliverable view ─────────────────────────────────────────────────────

  if (
    selectedPost &&
    (selectedPost.status === "composed" || selectedPost.status === "delivered")
  ) {
    return (
      <DeliverableView
        post={selectedPost}
        onBack={() => setSelectedId(null)}
        copied={copied}
        onCopy={handleCopy}
      />
    );
  }

  // ── Validation view ──────────────────────────────────────────────────────

  if (selectedPost) {
    return (
      <ValidationView
        post={selectedPost}
        selections={postSelections}
        onSelectImage={(slideNum, url, thumbUrl) =>
          handleSelectImage(selectedPost.id, slideNum, url, thumbUrl)
        }
        allSelected={allSelected}
        loading={loading}
        error={error}
        onValidate={handleValidateAndCompose}
        onReject={handleReject}
        onBack={() => { setSelectedId(null); setError(null); }}
      />
    );
  }

  // ── List view ────────────────────────────────────────────────────────────

  return (
    <ListView
      posts={posts}
      generating={generating}
      error={error}
      onGenerate={handleGenerate}
      onSelect={(id) => { setSelectedId(id); setError(null); }}
    />
  );
}

// ── ListView ─────────────────────────────────────────────────────────────────

function ListView({
  posts,
  generating,
  error,
  onGenerate,
  onSelect,
}: {
  posts: Post[];
  generating: boolean;
  error: string | null;
  onGenerate: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Header */}
      <div style={{
        padding: "28px 32px 0",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <h1 style={{ color: "white", fontSize: 24, fontWeight: 700, margin: 0 }}>
            🎬 Carrousels TikTok
          </h1>
          <p style={{ color: "#71717a", fontSize: 14, marginTop: 4 }}>
            Validation humaine des carrousels générés par IA
          </p>
        </div>
        <button
          onClick={onGenerate}
          disabled={generating}
          style={{
            background: generating ? "#27272a" : "linear-gradient(135deg, #7c3aed, #db2777)",
            color: generating ? "#71717a" : "white",
            border: "none", borderRadius: 10, padding: "11px 22px",
            fontSize: 14, fontWeight: 600, cursor: generating ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          {generating ? (
            <>
              <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
              Génération en cours…
            </>
          ) : (
            <>✨ Générer 3 restaurants</>
          )}
        </button>
      </div>

      {error && (
        <div style={{
          margin: "16px 32px 0",
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 10, padding: "12px 16px", color: "#fca5a5", fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 32px 32px" }}>
        {posts.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "80px 0", color: "#52525b",
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: "#71717a", marginBottom: 8 }}>
              Aucun carrousel en attente
            </div>
            <div style={{ fontSize: 13, color: "#52525b" }}>
              Clique sur « Générer 3 restaurants » pour démarrer l&apos;agent IA
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {posts.map(post => {
              const cfg = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.awaiting_validation;
              return (
                <button
                  key={post.id}
                  onClick={() => onSelect(post.id)}
                  style={{
                    background: "#111113", border: "1px solid #1f1f23",
                    borderRadius: 14, padding: "18px 20px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 12, cursor: "pointer", textAlign: "left",
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#7c3aed")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#1f1f23")}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                      <span style={{ color: "white", fontWeight: 700, fontSize: 15 }}>
                        {post.restaurantName}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                        color: cfg.color, background: cfg.bg,
                      }}>
                        {cfg.label}
                      </span>
                    </div>
                    {post.address && (
                      <div style={{ color: "#71717a", fontSize: 12, marginBottom: 4 }}>
                        📍 {post.address}
                      </div>
                    )}
                    <div style={{ color: "#52525b", fontSize: 12 }}>
                      {post.slides.length} slides · {new Date(post.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <span style={{ color: "#52525b", fontSize: 18 }}>→</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ValidationView ────────────────────────────────────────────────────────────

function ValidationView({
  post,
  selections,
  onSelectImage,
  allSelected,
  loading,
  error,
  onValidate,
  onReject,
  onBack,
}: {
  post: Post;
  selections: Selection;
  onSelectImage: (slideNum: number, url: string, thumbUrl: string) => void;
  allSelected: boolean;
  loading: boolean;
  error: string | null;
  onValidate: () => void;
  onReject: () => void;
  onBack: () => void;
}) {
  const notes = post.verificationNotes;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Header */}
      <div style={{
        padding: "20px 32px", borderBottom: "1px solid #1f1f23",
        display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
      }}>
        <button
          onClick={onBack}
          style={{
            background: "transparent", border: "1px solid #27272a", color: "#a1a1aa",
            borderRadius: 8, padding: "7px 14px", fontSize: 13, cursor: "pointer",
          }}
        >
          ← Retour
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ color: "white", fontSize: 20, fontWeight: 700, margin: 0 }}>
              {post.restaurantName}
            </h2>
          </div>
          {post.address && (
            <div style={{ color: "#71717a", fontSize: 13, marginTop: 2 }}>
              📍 {post.address}
            </div>
          )}
        </div>
        {/* Quick info pills */}
        {notes.cuisine && (
          <span style={{ fontSize: 12, color: "#a1a1aa", background: "#18181b", padding: "4px 10px", borderRadius: 20 }}>
            🍽️ {notes.cuisine}
          </span>
        )}
        {notes.priceRange && (
          <span style={{ fontSize: 12, color: "#a1a1aa", background: "#18181b", padding: "4px 10px", borderRadius: 20 }}>
            💶 {notes.priceRange}
          </span>
        )}
        {notes.hours && (
          <span style={{ fontSize: 12, color: "#a1a1aa", background: "#18181b", padding: "4px 10px", borderRadius: 20 }}>
            🕐 {notes.hours}
          </span>
        )}
      </div>

      {/* to_verify warning */}
      {notes.toVerify && notes.toVerify.length > 0 && (
        <div style={{
          margin: "12px 32px 0",
          background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
          borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#fcd34d",
        }}>
          ⚠️ À vérifier avant publication : {notes.toVerify.join(" · ")}
        </div>
      )}

      {error && (
        <div style={{
          margin: "12px 32px 0",
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 10, padding: "10px 14px", color: "#fca5a5", fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* Slides */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 32px 0" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {post.slides.map(slide => {
            const lines = slideLines(slide.text);
            const selected = selections[slide.number];
            const isCTA = slide.number === 4 || slide.text.includes("@guest_for_dinner");

            return (
              <div
                key={slide.number}
                style={{
                  background: "#111113", border: "1px solid #1f1f23",
                  borderRadius: 16, padding: 20,
                }}
              >
                <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 12 }}>
                  <span style={{
                    background: isCTA ? "linear-gradient(135deg, #7c3aed, #db2777)" : "#27272a",
                    color: "white", fontSize: 12, fontWeight: 700,
                    padding: "3px 10px", borderRadius: 20,
                  }}>
                    Slide {slide.number}{isCTA ? " · CTA" : ""}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                  {/* Text preview */}
                  <div style={{
                    flex: "0 0 280px", background: "#18181b", borderRadius: 12,
                    padding: "14px 16px", minHeight: 80,
                  }}>
                    {lines.map((line, i) => (
                      <div key={i} style={{
                        fontSize: 13, lineHeight: 1.6, marginBottom: line === "" ? 6 : 0,
                        color: line.includes("@") ? "#a78bfa" : "#e4e4e7",
                        fontWeight: i === 0 && !isCTA ? 600 : 400,
                      }}>
                        {line || " "}
                      </div>
                    ))}
                  </div>

                  {/* Image candidates */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    {slide.imageCandidates.length === 0 ? (
                      <div style={{
                        color: "#52525b", fontSize: 12, padding: "12px 0",
                        fontStyle: "italic",
                      }}>
                        Aucune image candidate (UNSPLASH_ACCESS_KEY manquante)
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {slide.imageCandidates.map((img, i) => {
                          const isSelected = selected?.url === img.url;
                          return (
                            <button
                              key={i}
                              onClick={() => onSelectImage(slide.number, img.url, img.thumbUrl)}
                              title={`${img.author} — ${img.source}`}
                              style={{
                                padding: 0, background: "none", cursor: "pointer",
                                border: `2px solid ${isSelected ? "#7c3aed" : "#27272a"}`,
                                borderRadius: 10, overflow: "hidden",
                                position: "relative",
                                transition: "border-color 0.15s",
                                flexShrink: 0,
                              }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={img.thumbUrl || img.url}
                                alt={`Candidate ${i + 1}`}
                                width={90}
                                height={90}
                                style={{ display: "block", objectFit: "cover", width: 90, height: 90 }}
                              />
                              {isSelected && (
                                <div style={{
                                  position: "absolute", inset: 0,
                                  background: "rgba(124,58,237,0.25)",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                }}>
                                  <span style={{ fontSize: 22 }}>✓</span>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {selected && (
                      <div style={{ color: "#10b981", fontSize: 11, marginTop: 8 }}>
                        ✓ Image sélectionnée
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action bar */}
      <div style={{
        padding: "16px 32px", borderTop: "1px solid #1f1f23",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        background: "#0a0a0f",
      }}>
        <div style={{ fontSize: 13, color: "#71717a" }}>
          {Object.keys(selections).length} / {post.slides.length} slides sélectionnées
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onReject}
            disabled={loading}
            style={{
              background: "transparent", border: "1px solid rgba(239,68,68,0.4)",
              color: "#f87171", borderRadius: 8, padding: "9px 18px",
              fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            ✕ Rejeter
          </button>
          <button
            onClick={onValidate}
            disabled={!allSelected || loading}
            style={{
              background: allSelected && !loading
                ? "linear-gradient(135deg, #7c3aed, #db2777)"
                : "#27272a",
              color: allSelected && !loading ? "white" : "#52525b",
              border: "none", borderRadius: 8, padding: "9px 20px",
              fontSize: 13, fontWeight: 600,
              cursor: allSelected && !loading ? "pointer" : "not-allowed",
            }}
          >
            {loading ? "En cours…" : "✓ Valider & Composer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DeliverableView ──────────────────────────────────────────────────────────

function DeliverableView({
  post,
  onBack,
  copied,
  onCopy,
}: {
  post: Post;
  onBack: () => void;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  const captionText = [
    post.caption ?? "",
    post.hashtags.length ? "\n\n" + post.hashtags.join(" ") : "",
  ].join("").trim();

  const hashtagsText = post.hashtags.join(" ");

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Header */}
      <div style={{
        padding: "20px 32px", borderBottom: "1px solid #1f1f23",
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <button
          onClick={onBack}
          style={{
            background: "transparent", border: "1px solid #27272a", color: "#a1a1aa",
            borderRadius: 8, padding: "7px 14px", fontSize: 13, cursor: "pointer",
          }}
        >
          ← Retour
        </button>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 style={{ color: "white", fontSize: 20, fontWeight: 700, margin: 0 }}>
              {post.restaurantName}
            </h2>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
              color: "#a78bfa", background: "rgba(167,139,250,0.12)",
            }}>
              Composé ✓
            </span>
          </div>
          <div style={{ color: "#71717a", fontSize: 13, marginTop: 2 }}>
            {post.slides.length} slides · Prêt pour publication
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px 32px" }}>
        {/* Slide previews */}
        <h3 style={{ color: "#a1a1aa", fontSize: 13, fontWeight: 600, marginBottom: 16, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Slides (1080×1920)
        </h3>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 32 }}>
          {post.slides.map(slide => {
            const slideUrl = `/api/carousel/${post.id}/slide/${slide.number}`;
            return (
              <div key={slide.number} style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                <div style={{
                  width: 120, height: 213, borderRadius: 10, overflow: "hidden",
                  border: "1px solid #27272a", background: "#1a1a2e",
                  position: "relative",
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slideUrl}
                    alt={`Slide ${slide.number}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                <a
                  href={slideUrl}
                  download={`slide-${slide.number}.png`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 11, color: "#a78bfa", textDecoration: "none",
                    background: "rgba(167,139,250,0.1)", padding: "4px 10px",
                    borderRadius: 6, border: "1px solid rgba(167,139,250,0.2)",
                  }}
                >
                  ↓ Slide {slide.number}
                </a>
              </div>
            );
          })}
        </div>

        {/* Caption */}
        {post.caption && (
          <div style={{ marginBottom: 24 }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 10,
            }}>
              <h3 style={{ color: "#a1a1aa", fontSize: 13, fontWeight: 600, margin: 0, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Légende
              </h3>
              <button
                onClick={() => onCopy(captionText, "caption")}
                style={{
                  background: "transparent", border: "1px solid #27272a",
                  color: copied === "caption" ? "#10b981" : "#71717a",
                  borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer",
                }}
              >
                {copied === "caption" ? "✓ Copié !" : "Copier"}
              </button>
            </div>
            <div style={{
              background: "#111113", border: "1px solid #1f1f23", borderRadius: 12,
              padding: "14px 16px", fontSize: 13, color: "#e4e4e7",
              lineHeight: 1.7, whiteSpace: "pre-wrap",
            }}>
              {post.caption}
              {post.hashtags.length > 0 && (
                <>
                  {"\n\n"}
                  <span style={{ color: "#a78bfa" }}>{hashtagsText}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Hashtags */}
        {post.hashtags.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 10,
            }}>
              <h3 style={{ color: "#a1a1aa", fontSize: 13, fontWeight: 600, margin: 0, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Hashtags
              </h3>
              <button
                onClick={() => onCopy(hashtagsText, "hashtags")}
                style={{
                  background: "transparent", border: "1px solid #27272a",
                  color: copied === "hashtags" ? "#10b981" : "#71717a",
                  borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer",
                }}
              >
                {copied === "hashtags" ? "✓ Copié !" : "Copier"}
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {post.hashtags.map((tag, i) => (
                <span key={i} style={{
                  background: "rgba(167,139,250,0.1)", color: "#a78bfa",
                  fontSize: 12, padding: "4px 10px", borderRadius: 20,
                  border: "1px solid rgba(167,139,250,0.2)",
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
