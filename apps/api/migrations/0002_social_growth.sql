ALTER TABLE users
  ADD COLUMN level INT NOT NULL DEFAULT 1,
  ADD COLUMN exp INT NOT NULL DEFAULT 0,
  ADD COLUMN equipped_title_id INT UNSIGNED NULL;

ALTER TABLE users
  ADD CONSTRAINT chk_users_level CHECK (level BETWEEN 1 AND 20),
  ADD CONSTRAINT chk_users_exp CHECK (exp >= 0);

CREATE TABLE IF NOT EXISTS xp_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  source VARCHAR(24) NOT NULL,
  amount INT NOT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_xp_user_source_time (user_id, source, created_at),
  CONSTRAINT fk_xp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS checkins (
  user_id BIGINT UNSIGNED NOT NULL,
  checkin_date DATE NOT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (user_id, checkin_date),
  KEY idx_checkins_date (checkin_date),
  CONSTRAINT fk_checkins_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS user_follows (
  follower_id BIGINT UNSIGNED NOT NULL,
  followee_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (follower_id, followee_id),
  KEY idx_user_follows_followee (followee_id, created_at),
  CONSTRAINT fk_user_follows_follower FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_follows_followee FOREIGN KEY (followee_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS titles (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(64) NOT NULL,
  name VARCHAR(32) NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  icon VARCHAR(4) NOT NULL DEFAULT '雅',
  min_level INT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_titles_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS user_titles (
  user_id BIGINT UNSIGNED NOT NULL,
  title_id INT UNSIGNED NOT NULL,
  acquired_at DATETIME(3) NOT NULL,
  PRIMARY KEY (user_id, title_id),
  CONSTRAINT fk_user_titles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_titles_title FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS achievements (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(64) NOT NULL,
  name VARCHAR(32) NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  icon VARCHAR(4) NOT NULL DEFAULT '成',
  condition_type VARCHAR(32) NOT NULL,
  threshold INT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_achievements_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id BIGINT UNSIGNED NOT NULL,
  achievement_id INT UNSIGNED NOT NULL,
  unlocked_at DATETIME(3) NOT NULL,
  PRIMARY KEY (user_id, achievement_id),
  CONSTRAINT fk_user_achievements_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_achievements_achievement FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO titles (slug, name, description, icon, min_level, sort_order) VALUES
  ('newcomer', '初入雅集', '刚刚入席，来者皆是客', '初', 1, 10),
  ('tea', '煮茶客', '能为来客煮一壶茶', '茶', 3, 20),
  ('listener', '听雨人', '听得懂雨声，也听得懂人声', '雨', 5, 30),
  ('bookworm', '藏书家', '腹有诗书气自华', '书', 8, 40),
  ('mountain', '山中宰相', '不出山，亦知天下事', '山', 12, 50),
  ('master', '雅集主人', '一席之主，调和众声', '主', 16, 60),
  ('legend', '清谈传奇', '二十级之后，仍是清谈', '传', 20, 70);

INSERT IGNORE INTO achievements (slug, name, description, icon, condition_type, threshold, sort_order) VALUES
  ('first_thread', '初开一帖', '发布第一个主题', '帖', 'threads', 1, 10),
  ('ten_threads', '十帖之约', '累计发布 10 个主题', '约', 'threads', 10, 20),
  ('first_reply', '一鸣惊人', '发布第一条回复', '鸣', 'replies', 1, 30),
  ('fifty_posts', '清谈五十', '累计发布 50 条回复', '谈', 'replies', 50, 40),
  ('five_followers', '高朋满座', '拥有 5 位粉丝', '朋', 'followers', 5, 50),
  ('level_five', '五级雅士', '达到 5 级', '五', 'level', 5, 60),
  ('seven_checkins', '七日不断', '累计签到 7 天', '七', 'checkins', 7, 70),
  ('ten_likes', '投我木桃', '自己的帖子累计获得 10 个赞', '桃', 'likes_received', 10, 80);
