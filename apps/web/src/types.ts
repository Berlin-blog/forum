export type User = {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  userRole: string;
  level: number;
  exp: number;
  equippedTitleId: number | null;
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
  isFollowing?: boolean;
  createdBy?: number | null;
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

export type Title = {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  minLevel: number;
};

export type Achievement = {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string;
};

export type ReplyItem = {
  id: number;
  threadId: number;
  contentText: string;
  createdAt: string;
  threadTitle: string;
  barSlug: string;
  barName: string;
};

export type UserProfile = {
  user: User;
  equippedTitle: Title | null;
  stats: {
    followers: number;
    following: number;
    threads: number;
    posts: number;
    checkins: number;
    likesReceived: number;
  };
  followedBars: Array<Bar & { joinedAt?: string }>;
  threads: Array<{
    id: number;
    title: string;
    replyCount: number;
    lastPostAt: string;
    barSlug: string;
    barName: string;
  }>;
  replies: ReplyItem[];
  titles: Title[];
  achievements: Achievement[];
  isFollowing: boolean;
  isSelf: boolean;
};

export type NotificationItem = {
  id: number;
  type: string;
  payload: { kind?: string; level?: number; title?: string };
  readAt: string | null;
  createdAt: string;
  threadId: number | null;
  postId: number | null;
  actorName: string | null;
  actorUsername: string | null;
  threadTitle: string | null;
};

export type Progress = {
  level: number;
  exp: number;
  levelFloor: number;
  nextLevelExp: number;
  currentLevelExp: number;
  levelNeed: number;
  percent: number;
};
