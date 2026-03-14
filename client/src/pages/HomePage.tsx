import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePosts } from "../hooks/usePosts";
import PostCard from "../components/PostCard";
import { filterPostsByQuery } from "../utils/postSearch";

function HomePage() {
  const { user } = useAuth();
  const { posts, isLoading, isFetchingMore, hasMore, error, sentinelRef } =
    usePosts();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPosts = useMemo(
    () => filterPostsByQuery(posts, searchQuery),
    [posts, searchQuery],
  );
  const isSearchActive = searchQuery.trim().length > 0;

  return (
    <div className="container py-4" style={{ maxWidth: 900 }}>
      {/* Page header */}
      <div className="travel-page-header d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h2 className="fw-bold mb-0">Travel Feed</h2>
          <p className="text-muted small mb-0">
            Explore travel stories from the community
          </p>
        </div>
        {user && (
          <Link to="/create" className="btn btn-primary">
            + New Post
          </Link>
        )}
      </div>

      <div className="home-search-wrap my-3">
        <div className="home-search-input-wrap">
          <input
            type="text"
            className="form-control home-search-field"
            placeholder="Search by title, content, or username..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            aria-label="Search posts"
          />
          {isSearchActive && (
            <button
              type="button"
              className="home-search-clear"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              x
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Loading skeleton on initial load */}
      {isLoading && (
        <div className="row g-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="col-12 col-sm-6 col-md-4">
              <div
                className="card border-0 shadow-sm placeholder-glow"
                style={{ height: 320 }}
              >
                <div
                  className="placeholder w-100"
                  style={{ height: 200, borderRadius: "0.375rem 0.375rem 0 0" }}
                />
                <div className="card-body">
                  <p className="placeholder col-8 mb-2" />
                  <p className="placeholder col-12 mb-1" />
                  <p className="placeholder col-10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post grid */}
      {!isLoading && posts.length === 0 && !error && (
        <div className="empty-state text-center text-muted">
          <p className="fs-5">No posts yet.</p>
          {user ? (
            <Link to="/create" className="btn btn-outline-primary">
              Be the first to share your journey!
            </Link>
          ) : (
            <Link to="/register" className="btn btn-outline-primary">
              Join to start sharing
            </Link>
          )}
        </div>
      )}

      {!isLoading && posts.length > 0 && filteredPosts.length === 0 && !error && (
        <div className="empty-state text-center text-muted">
          <p className="fs-5 mb-1">No matching posts found.</p>
          <p className="small mb-0">Try a different search term.</p>
        </div>
      )}

      {!isLoading && filteredPosts.length > 0 && (
        <div className="row g-3">
          {filteredPosts.map((post) => (
            <div key={post._id} className="col-12 col-sm-6 col-md-4">
              <PostCard post={post} currentUserId={user?._id} />
            </div>
          ))}
        </div>
      )}

      {/* Sentinel — IntersectionObserver hooks here to auto-load next page */}
      {!isLoading && hasMore && (
        <div ref={sentinelRef} className="py-2" aria-hidden="true" />
      )}

      {/* Spinner while fetching more */}
      {isFetchingMore && (
        <div className="text-center py-3">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading more…</span>
          </div>
        </div>
      )}

      {/* End of feed */}
      {!isLoading && !hasMore && posts.length > 0 && !isSearchActive && (
        <p className="text-center text-muted small py-3">
          You've reached the end of the feed.
        </p>
      )}
    </div>
  );
}

export default HomePage;
