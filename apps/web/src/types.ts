export type User = {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  userRole: string;
  createdAt: string;
};

export type Bar = {
  id: number;
  slug: string;
  name: string;
  description: string;
  threadCount: number;
  postCount: number;
  memberCount: number;
};

export type Category = {
  id: number;
  slug: string;
  name: string;
  bars: Array<Bar & {
    categoryId: number;
    categorySlug: string;
    categoryName: string;
    categorySort: number;
  }>;
};

export type ThreadSummary = {
  id: number;
  title: string;
  replyCount: number;
  viewCount: number;
  isPinned: boolean;
  isFeatured: boolean;
  lastPostAt: string;
  createdAt: string;
  authorName: string;
  authorUsername: string;
  barSlug: string;
  barName: string;
};

export type ThreadDetail = {
  id: number;
  title: string;
  replyCount: number;
  viewCount: number;
  status: 'open' | 'locked' | 'deleted';
  createdAt: string;
  lastPostAt: string;
  barId: number;
  barSlug: string;
  barName: string;
  authorId: number;
  authorName: string;
  authorUsername: string;
};

export type Post = {
  id: number;
  threadId: number;
  parentId: number | null;
  floor: number | null;
  contentHtml: string;
  createdAt: string;
  childCount: number;
  authorId: number;
  authorName: string;
  authorUsername: string;
  avatarUrl: string | null;
};

export type FirstPost = {
  id: number;
  contentHtml: string;
  contentMd: string;
  createdAt: string;
};
