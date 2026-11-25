ALTER TABLE titles
  ADD COLUMN condition_type VARCHAR(32) NULL AFTER min_level,
  ADD COLUMN condition_threshold INT UNSIGNED NULL AFTER condition_type;

INSERT IGNORE INTO titles (slug, name, description, icon, min_level, condition_type, condition_threshold, sort_order) VALUES
  ('bar-founder', '开吧元老', '在一个吧的荒地上，插下第一面旗', '吧', 1, 'bars_created', 1, 200),
  ('bar-landlord', '一吧之主', '你创建的吧，已经有了十位常客', '主', 1, 'bar_members', 10, 201),
  ('reply-hundred', '百帖斩', '一百条回复，刀刀见血', '百', 1, 'replies', 100, 202),
  ('floor-lord', '楼中楼之王', '你盖的楼，物业都头疼', '楼', 1, 'replies', 50, 203),
  ('beloved', '万人迷', '十个人在等你更新', '迷', 1, 'followers', 10, 204),
  ('like-harvester', '点赞收割机', '你的帖子，路过的人都想按一下', '赞', 1, 'likes_received', 50, 205),
  ('checkin-sage', '签到仙人', '三十天，风雨无阻地来签到', '签', 1, 'checkins', 30, 206),
  ('thread-machine', '标题制造机', '你起标题的速度，比大家回帖还快', '题', 1, 'threads', 20, 207),
  ('night-owl', '深夜不睡', '凌晨三点的论坛，只有你和服务器醒着', '夜', 1, 'night_posts', 20, 208);
