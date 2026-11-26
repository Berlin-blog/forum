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
  lastSeenAt?: string | null;
};

export type Bar = {
  id: number;
  slug: string;
  name: string;
  description: string;
  rules?: string | null;
  threadCount: number;
  postCount: number;
  memberCount: number;
  isFollowing?: boolean;
  canManage?: boolean;
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
  authorRole?: string;
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
  authorRole?: string;
};

export type Post = {
  id: number;
  threadId: number;
  parentId: number | null;
  floor: number | null;
  contentHtml: string;
  contentMd: string;
  contentText: string;
  createdAt: string;
  editedAt: string | null;
  childCount: number;
  likeCount: number;
  liked: boolean;
  authorId: number;
  authorName: string;
  authorUsername: string;
  authorRole?: string;
  avatarUrl: string | null;
};

export type FirstPost = {
  id: number;
  contentHtml: string;
  contentMd: string;
  contentText: string;
  createdAt: string;
  editedAt: string | null;
  likeCount: number;
  liked: boolean;
};

export type Title = {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  minLevel: number;
  expiresAt?: string | null;
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
    isPinned?: boolean;
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
