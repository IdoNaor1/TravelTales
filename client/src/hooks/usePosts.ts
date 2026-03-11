import { useState, useEffect, useCallback, useRef } from "react";
import postService from "../services/postService";
import type { IPost } from "../types";

interface UsePostsOptions {
  senderId?: string;
  limit?: number;
}

interface UsePostsResult {
  posts: IPost[];
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  refresh: () => void;
  /** Attach to a sentinel element to trigger automatic infinite scroll */
  sentinelRef: (node: HTMLDivElement | null) => void;
}

export function usePosts({
  senderId,
  limit = 10,
}: UsePostsOptions = {}): UsePostsResult {
  const [posts, setPosts] = useState<IPost[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Tracks whether we've done the first load after a refresh/mount
  const isInitialized = useRef(false);

  const fetchPage = useCallback(
    async (
      nextCursor?: string,
    ): Promise<{ posts: IPost[]; nextCursor: string | null } | null> => {
      try {
        const page = senderId
          ? await postService.getPostsBySender(senderId, nextCursor, limit)
          : await postService.getPosts(nextCursor, limit);
        return page;
      } catch {
        setError("Failed to load posts. Please try again.");
        return null;
      }
    },
    [senderId, limit],
  );

  // Initial load / refresh — exposed so callers can manually trigger a reload
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setPosts([]);
    setCursor(undefined);
    setHasMore(true);
    isInitialized.current = false;
    const page = await fetchPage(undefined);
    if (page) {
      setPosts(page.posts);
      setCursor(page.nextCursor ?? undefined);
      setHasMore(page.nextCursor !== null);
    }
    setIsLoading(false);
    isInitialized.current = true;
  }, [fetchPage]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      setPosts([]);
      setCursor(undefined);
      setHasMore(true);
      isInitialized.current = false;

      const page = senderId
        ? await postService.getPostsBySender(senderId, undefined, limit)
        : await postService.getPosts(undefined, limit);

      if (!cancelled) {
        setPosts(page.posts);
        setCursor(page.nextCursor ?? undefined);
        setHasMore(page.nextCursor !== null);
        setIsLoading(false);
        isInitialized.current = true;
      }
    };

    load().catch(() => {
      if (!cancelled) {
        setError("Failed to load posts. Please try again.");
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [senderId, limit]);

  // Load next page
  const loadMore = useCallback(async () => {
    if (isFetchingMore || !hasMore || isLoading) return;
    setIsFetchingMore(true);
    const page = await fetchPage(cursor);
    if (page) {
      setPosts((prev) => [...prev, ...page.posts]);
      setCursor(page.nextCursor ?? undefined);
      setHasMore(page.nextCursor !== null);
    }
    setIsFetchingMore(false);
  }, [isFetchingMore, hasMore, isLoading, fetchPage, cursor]);

  // IntersectionObserver sentinel for automatic infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (!node) return;
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && isInitialized.current) {
            loadMore();
          }
        },
        { rootMargin: "200px" },
      );
      observerRef.current.observe(node);
    },
    [loadMore],
  );

  return {
    posts,
    isLoading,
    isFetchingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    sentinelRef,
  };
}
