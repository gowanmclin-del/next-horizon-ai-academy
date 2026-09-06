export default function CourseVideo({ videoId, title }: { videoId: string; title: string }) {
  return (
    <section className="mt-6" aria-label={`${title} video`}>
      <div className="aspect-video overflow-hidden rounded-2xl bg-horizon-navy shadow-sm ring-1 ring-slate-200">
        <iframe
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </section>
  );
}
