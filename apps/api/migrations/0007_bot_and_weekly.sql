ALTER TABLE user_titles
  ADD COLUMN expires_at DATETIME(3) NULL AFTER acquired_at;

CREATE TABLE IF NOT EXISTS hot_topic_posts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  fingerprint CHAR(64) NOT NULL,
  source VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  url VARCHAR(1024) NOT NULL,
  bar_id BIGINT UNSIGNED NOT NULL,
  thread_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_hot_topic_fingerprint (fingerprint),
  KEY idx_hot_topic_thread (thread_id),
  CONSTRAINT fk_hot_topic_bar FOREIGN KEY (bar_id) REFERENCES bars(id),
  CONSTRAINT fk_hot_topic_thread FOREIGN KEY (thread_id) REFERENCES threads(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS weekly_settlements (
  week_start DATE NOT NULL,
  winners JSON NOT NULL,
  settled_at DATETIME(3) NOT NULL,
  PRIMARY KEY (week_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO titles (slug, name, description, icon, min_level, condition_type, condition_threshold, sort_order) VALUES
  ('weekly-champion', '本周魁首', '本周经验榜第一名，有效期 7 天', '魁', 1, 'weekly_rank', 1, 300),
  ('weekly-second', '本周亚席', '本周经验榜第二名，有效期 7 天', '亚', 1, 'weekly_rank', 2, 301),
  ('weekly-third', '本周季席', '本周经验榜第三名，有效期 7 天', '季', 1, 'weekly_rank', 3, 302);
