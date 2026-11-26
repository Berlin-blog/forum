export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <span className={`skeleton ${className}`} aria-hidden="true" />;
}

export function HomeSkeleton() {
  return (
    <div className="home-skeleton" aria-busy="true" aria-label="加载中">
      <div className="home-skeleton-hero">
        <div>
          <SkeletonBlock className="skeleton-kicker" />
          <SkeletonBlock className="skeleton-title" />
          <SkeletonBlock className="skeleton-title short" />
          <SkeletonBlock className="skeleton-text" />
          <SkeletonBlock className="skeleton-text short" />
        </div>
        <SkeletonBlock className="skeleton-hero-card" />
      </div>
      <div className="home-grid">
        <div>
          <SkeletonBlock className="skeleton-section-title" />
          <div className="home-skeleton-feature">
            <SkeletonBlock className="skeleton-feature-main" />
            <div className="home-skeleton-side">
              <SkeletonBlock className="skeleton-feature-side" />
              <SkeletonBlock className="skeleton-feature-side" />
            </div>
          </div>
          <SkeletonBlock className="skeleton-section-title" />
          <ListSkeleton rows={4} />
        </div>
        <aside className="home-skeleton-aside">
          <SkeletonBlock className="skeleton-side-card" />
          <SkeletonBlock className="skeleton-side-card" />
          <SkeletonBlock className="skeleton-side-card short" />
        </aside>
      </div>
    </div>
  );
}

export function ThreadSkeleton() {
  return (
    <div className="thread-skeleton" aria-busy="true" aria-label="加载中">
      <SkeletonBlock className="skeleton-breadcrumb" />
      <SkeletonBlock className="skeleton-thread-head" />
      <SkeletonBlock className="skeleton-thread-post" />
      <ListSkeleton rows={2} />
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="list-skeleton" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div className="skeleton-row" key={index}>
          <SkeletonBlock className="skeleton-index" />
          <div className="skeleton-row-main">
            <SkeletonBlock className="skeleton-line" />
            <SkeletonBlock className="skeleton-line short" />
          </div>
          <SkeletonBlock className="skeleton-stat" />
        </div>
      ))}
    </div>
  );
}

export function GridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid-skeleton" aria-busy="true" aria-label="加载中">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonBlock className="skeleton-grid-card" key={index} />
      ))}
    </div>
  );
}
