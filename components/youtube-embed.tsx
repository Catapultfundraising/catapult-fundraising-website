interface YouTubeEmbedProps {
  /** YouTube video id, e.g. "4QjCKATeUeI". */
  id: string;
  /** Accessible title for the player iframe. */
  title: string;
  /** Optional caption shown under the player. */
  caption?: string;
}

/**
 * Responsive, privacy-friendly YouTube embed (youtube-nocookie) used in
 * articles that reference a podcast or video appearance. Kept as a component
 * so every article gets the same 16:9 framing, rounded card, and caption
 * treatment instead of one-off inline iframes.
 */
export function YouTubeEmbed({ id, title, caption }: YouTubeEmbedProps) {
  return (
    <figure className="my-10">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[rgb(var(--navy))] shadow-sm">
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${id}`}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      {caption ? (
        <figcaption className="mt-3 text-sm leading-relaxed text-[rgb(var(--ink))]/50">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
