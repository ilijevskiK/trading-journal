"use client";

import { useMemo, useState } from "react";
import { VIDEOS } from "@/content/videos";

export default function VideosPage() {
  const [activeCategory, setActiveCategory] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const categories = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const video of VIDEOS) {
      if (!seen.has(video.category)) {
        seen.add(video.category);
        list.push(video.category);
      }
    }
    return list;
  }, []);

  const visibleVideos = activeCategory
    ? VIDEOS.filter((video) => video.category === activeCategory)
    : VIDEOS;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-3xl text-parchment">Videos</h1>
        <span className="font-mono text-xs text-parchment-faint">
          {visibleVideos.length} of {VIDEOS.length} video{VIDEOS.length === 1 ? "" : "s"}
        </span>
      </div>
      <p className="text-xs text-parchment-faint mt-2 max-w-lg">
        Trading and investing videos worth actually watching. Curated, not
        user-editable.
      </p>

      <div className="flex flex-wrap gap-2 mt-4">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          className={`text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full border transition-colors ${
            activeCategory === null
              ? "border-gold-dim text-gold-bright bg-surface-alt"
              : "border-line text-parchment-faint hover:text-parchment hover:border-gold-dim/60"
          }`}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full border transition-colors ${
              activeCategory === category
                ? "border-gold-dim text-gold-bright bg-surface-alt"
                : "border-line text-parchment-faint hover:text-parchment hover:border-gold-dim/60"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="rule-divider mt-4 mb-6" />

      {visibleVideos.length === 0 ? (
        <div className="border border-line rounded-lg bg-surface px-6 py-10 text-center text-sm text-parchment-faint">
          No videos in this category.
        </div>
      ) : (
        <div className="space-y-2.5">
          {visibleVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              expanded={expandedId === video.id}
              onToggle={() =>
                setExpandedId((current) => (current === video.id ? null : video.id))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function VideoCard({ video, expanded, onToggle }) {
  return (
    <div className="border border-line rounded-lg bg-surface overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start gap-4 px-4 py-3 text-left hover:bg-surface-alt/50 transition-colors"
      >
        <div className="relative w-32 aspect-video shrink-0 rounded overflow-hidden bg-ink">
          <img
            src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-ink/70 flex items-center justify-center">
              <div className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-parchment ml-0.5" />
            </div>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-sm text-parchment truncate">{video.title}</p>
          <p className="text-xs text-parchment-faint mt-1">{video.channel}</p>
          <span className="inline-block text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-gold-dim text-gold-bright mt-1.5">
            {video.category}
          </span>
          {video.note && (
            <p className="text-xs text-parchment-faint mt-2 whitespace-normal">{video.note}</p>
          )}
        </div>
      </button>
      {expanded && (
        <div className="aspect-video w-full bg-ink">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.id}`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      )}
    </div>
  );
}
