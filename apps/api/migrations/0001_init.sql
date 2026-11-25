USE forum;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(32) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(64) NOT NULL,
  avatar_url VARCHAR(512) NULL,
  bio VARCHAR(500) NOT NULL DEFAULT '',
  user_role VARCHAR(16) NOT NULL DEFAULT 'member',
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_seen_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_username (username),
  KEY idx_users_status (status),
  CONSTRAINT chk_users_role CHECK (user_role IN ('member', 'admin')),
  CONSTRAINT chk_users_status CHECK (status IN ('active', 'suspended', 'deleted'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id CHAR(36) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  revoked_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_sessions_token_hash (token_hash),
  KEY idx_sessions_user (user_id, expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(64) NOT NULL,
  name VARCHAR(64) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_categories_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS bars (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id INT UNSIGNED NOT NULL,
  slug VARCHAR(64) NOT NULL,
  name VARCHAR(64) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  rules TEXT NULL,
  avatar_url VARCHAR(512) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  sort_order INT NOT NULL DEFAULT 0,
  thread_count INT UNSIGNED NOT NULL DEFAULT 0,
  post_count INT UNSIGNED NOT NULL DEFAULT 0,
  member_count INT UNSIGNED NOT NULL DEFAULT 0,
  last_thread_id BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_bars_slug (slug),
  KEY idx_bars_category (category_id, sort_order),
  KEY idx_bars_status (status, member_count),
  CONSTRAINT fk_bars_category FOREIGN KEY (category_id) REFERENCES categories(id),
  CONSTRAINT fk_bars_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_bars_status CHECK (status IN ('active', 'hidden', 'deleted'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS bar_members (
  user_id BIGINT UNSIGNED NOT NULL,
  bar_id BIGINT UNSIGNED NOT NULL,
  joined_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, bar_id),
  KEY idx_bar_members_bar (bar_id, joined_at),
  CONSTRAINT fk_bar_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bar_members_bar FOREIGN KEY (bar_id) REFERENCES bars(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS bar_moderators (
  bar_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  mod_role VARCHAR(16) NOT NULL DEFAULT 'moderator',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (bar_id, user_id),
  KEY idx_bar_moderators_user (user_id),
  CONSTRAINT fk_bar_moderators_bar FOREIGN KEY (bar_id) REFERENCES bars(id) ON DELETE CASCADE,
  CONSTRAINT fk_bar_moderators_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_bar_moderators_role CHECK (mod_role IN ('owner', 'moderator'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS threads (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  bar_id BIGINT UNSIGNED NOT NULL,
  author_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(120) NOT NULL,
  slug VARCHAR(160) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'open',
  is_pinned TINYINT(1) NOT NULL DEFAULT 0,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  reply_count INT UNSIGNED NOT NULL DEFAULT 0,
  view_count INT UNSIGNED NOT NULL DEFAULT 0,
  last_post_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_threads_bar_slug (bar_id, slug),
  KEY idx_threads_bar_last (bar_id, status, is_pinned, last_post_at),
  KEY idx_threads_bar_featured (bar_id, status, is_featured, last_post_at),
  KEY idx_threads_author (author_id, created_at),
  FULLTEXT KEY ft_threads_title (title) WITH PARSER ngram,
  CONSTRAINT fk_threads_bar FOREIGN KEY (bar_id) REFERENCES bars(id),
  CONSTRAINT fk_threads_author FOREIGN KEY (author_id) REFERENCES users(id),
  CONSTRAINT chk_threads_status CHECK (status IN ('open', 'locked', 'deleted'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS posts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  thread_id BIGINT UNSIGNED NOT NULL,
  author_id BIGINT UNSIGNED NOT NULL,
  parent_id BIGINT UNSIGNED NULL,
  floor INT UNSIGNED NULL,
  content_md MEDIUMTEXT NOT NULL,
  content_html MEDIUMTEXT NOT NULL,
  content_text MEDIUMTEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'visible',
  child_count INT UNSIGNED NOT NULL DEFAULT 0,
  edited_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_posts_thread_floor (thread_id, floor),
  KEY idx_posts_thread_parent (thread_id, parent_id, created_at),
  KEY idx_posts_parent (parent_id, created_at),
  KEY idx_posts_author (author_id, created_at),
  FULLTEXT KEY ft_posts_content (content_text) WITH PARSER ngram,
  CONSTRAINT fk_posts_thread FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
  CONSTRAINT fk_posts_author FOREIGN KEY (author_id) REFERENCES users(id),
  CONSTRAINT chk_posts_status CHECK (status IN ('visible', 'hidden', 'deleted'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS reactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  target_type VARCHAR(16) NOT NULL,
  target_id BIGINT UNSIGNED NOT NULL,
  kind VARCHAR(16) NOT NULL DEFAULT 'like',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_reactions_user_target (user_id, target_type, target_id, kind),
  KEY idx_reactions_target (target_type, target_id, kind),
  CONSTRAINT fk_reactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_reactions_target CHECK (target_type IN ('thread', 'post')),
  CONSTRAINT chk_reactions_kind CHECK (kind IN ('like'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS bookmarks (
  user_id BIGINT UNSIGNED NOT NULL,
  thread_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, thread_id),
  KEY idx_bookmarks_thread (thread_id),
  CONSTRAINT fk_bookmarks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookmarks_thread FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  notification_type VARCHAR(16) NOT NULL,
  actor_id BIGINT UNSIGNED NULL,
  thread_id BIGINT UNSIGNED NULL,
  post_id BIGINT UNSIGNED NULL,
  payload JSON NOT NULL,
  read_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_notifications_user (user_id, read_at, created_at),
  KEY idx_notifications_thread (thread_id),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_notifications_thread FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT chk_notifications_type CHECK (
    notification_type IN ('reply', 'mention', 'moderation', 'system', 'bar')
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reporter_id BIGINT UNSIGNED NOT NULL,
  target_type VARCHAR(16) NOT NULL,
  target_id BIGINT UNSIGNED NOT NULL,
  reason VARCHAR(16) NOT NULL,
  detail VARCHAR(1000) NOT NULL DEFAULT '',
  report_status VARCHAR(16) NOT NULL DEFAULT 'open',
  handled_by BIGINT UNSIGNED NULL,
  resolution VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  handled_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_reports_status (report_status, created_at),
  KEY idx_reports_target (target_type, target_id),
  CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users(id),
  CONSTRAINT fk_reports_handler FOREIGN KEY (handled_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_reports_target CHECK (target_type IN ('thread', 'post', 'user')),
  CONSTRAINT chk_reports_reason CHECK (reason IN ('spam', 'abuse', 'sexual', 'infringement', 'other')),
  CONSTRAINT chk_reports_status CHECK (report_status IN ('open', 'resolved', 'rejected'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS moderation_actions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_id BIGINT UNSIGNED NULL,
  bar_id BIGINT UNSIGNED NULL,
  action_type VARCHAR(32) NOT NULL,
  target_type VARCHAR(16) NOT NULL,
  target_id BIGINT UNSIGNED NOT NULL,
  reason VARCHAR(500) NOT NULL DEFAULT '',
  expires_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_moderation_target (target_type, target_id),
  KEY idx_moderation_bar (bar_id, created_at),
  CONSTRAINT fk_moderation_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_moderation_bar FOREIGN KEY (bar_id) REFERENCES bars(id) ON DELETE SET NULL,
  CONSTRAINT chk_moderation_target CHECK (target_type IN ('user', 'thread', 'post', 'bar')),
  CONSTRAINT chk_moderation_action CHECK (
    action_type IN ('hide', 'delete', 'restore', 'warn', 'mute', 'ban', 'unban',
                    'pin', 'unpin', 'feature', 'unfeature')
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO categories (slug, name, sort_order) VALUES
  ('tech', '科技', 10),
  ('life', '生活', 20),
  ('fun', '娱乐', 30),
  ('study', '学习', 40),
  ('work', '职场', 50),
  ('site', '站务', 90);

INSERT IGNORE INTO bars (category_id, slug, name, description)
SELECT id, 'internet', '互联网', '产品、平台、行业讨论' FROM categories WHERE slug = 'tech';
INSERT IGNORE INTO bars (category_id, slug, name, description)
SELECT id, 'programming', '编程', '语言、工具、求助' FROM categories WHERE slug = 'tech';
INSERT IGNORE INTO bars (category_id, slug, name, description)
SELECT id, 'life', '生活', '日常、消费、经验' FROM categories WHERE slug = 'life';
INSERT IGNORE INTO bars (category_id, slug, name, description)
SELECT id, 'emotion', '情感', '关系、困惑、倾诉' FROM categories WHERE slug = 'life';
INSERT IGNORE INTO bars (category_id, slug, name, description)
SELECT id, 'movie', '影视', '剧、电影、综艺' FROM categories WHERE slug = 'fun';
INSERT IGNORE INTO bars (category_id, slug, name, description)
SELECT id, 'game', '游戏', '游戏、攻略、组队' FROM categories WHERE slug = 'fun';
INSERT IGNORE INTO bars (category_id, slug, name, description)
SELECT id, 'study', '学习', '考试、方法、资料' FROM categories WHERE slug = 'study';
INSERT IGNORE INTO bars (category_id, slug, name, description)
SELECT id, 'career', '职场', '求职、工作、行业' FROM categories WHERE slug = 'work';
INSERT IGNORE INTO bars (category_id, slug, name, description)
SELECT id, 'notice', '公告', '站点规则、更新' FROM categories WHERE slug = 'site';
INSERT IGNORE INTO bars (category_id, slug, name, description)
SELECT id, 'feedback', '反馈', 'Bug、建议、申诉' FROM categories WHERE slug = 'site';
