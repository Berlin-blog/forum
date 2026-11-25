INSERT IGNORE INTO titles (slug, name, description, icon, min_level, sort_order) VALUES
  ('sweeper', '扫花人', '扫得阶前花，留得心中静', '花', 2, 15),
  ('tea-question', '问茶客', '逢人便问，何处有好茶', '问', 4, 25),
  ('cloud', '观云者', '看云卷云舒，不争一时', '云', 6, 35),
  ('sword', '藏锋', '锋芒藏于鞘，清谈藏于胸', '锋', 9, 45),
  ('taster', '知味', '知一席之味，也知人间冷暖', '味', 11, 55),
  ('hermit', '半隐', '半入红尘，半在山中', '隐', 14, 65),
  ('star', '摘星', '手可摘星辰，仍愿坐清谈', '星', 18, 75);

INSERT IGNORE INTO achievements (slug, name, description, icon, condition_type, threshold, sort_order) VALUES
  ('first_bar', '开山立吧', '创建第一个吧', '吧', 'bars_created', 1, 15),
  ('bar_gathering', '一吧之约', '自己创建的吧拥有 10 位成员', '聚', 'bar_members', 10, 25),
  ('level_ten', '十级清谈', '达到 10 级', '十', 'level', 10, 65),
  ('hundred_replies', '百帖清谈', '累计发布 100 条回复', '百', 'replies', 100, 45),
  ('twenty_followers', '门庭若市', '拥有 20 位粉丝', '门', 'followers', 20, 55),
  ('fifty_likes', '木桃满筐', '自己的帖子累计获得 50 个赞', '桃', 'likes_received', 50, 85),
  ('thirty_checkins', '三十日课', '累计签到 30 天', '课', 'checkins', 30, 75),
  ('five_bars', '五方雅集', '累计创建 5 个吧', '五', 'bars_created', 5, 35);
