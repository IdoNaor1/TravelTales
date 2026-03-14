import type { IPost, IUser } from "../types";

export function filterPostsByQuery(posts: IPost[], rawQuery: string): IPost[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return posts;

  return posts.filter((post) => {
    const title = post.title?.toLowerCase() ?? "";
    const content = post.content?.toLowerCase() ?? "";
    const senderUsername =
      typeof post.sender === "object"
        ? ((post.sender as IUser).username?.toLowerCase() ?? "")
        : "";

    return (
      title.includes(query) ||
      content.includes(query) ||
      senderUsername.includes(query)
    );
  });
}
