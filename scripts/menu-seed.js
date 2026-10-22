/* Dish + category seed used by the migration and the schedule/menu update. */
const categories = [
  { id: 'quick', name: '快手菜', icon: '⚡', order: 1 },
  { id: 'hardcore', name: '硬核菜', icon: '🔥', order: 2 }
];

const dishes = [
  { id: 'dish_tomato_egg', categoryId: 'quick', name: '番茄炒蛋', description: '酸甜下饭，拌米饭一绝', price: 20, prepMinutes: 15, icon: '🍅', image: 'assets/media/dishes/tomato-egg.jpg', tags: ['酸甜', '家常'], available: true, todaySpecial: true, order: 1 },
  { id: 'dish_potato_shreds', categoryId: 'quick', name: '酸辣土豆丝', description: '酸辣爽脆，开胃', price: 18, prepMinutes: 15, icon: '🥔', image: 'assets/media/dishes/potato.jpg', tags: ['酸辣', '爽口'], available: true, todaySpecial: false, order: 2 },
  { id: 'dish_mapo_tofu', categoryId: 'quick', name: '麻婆豆腐', description: '麻辣鲜香，很下饭', price: 22, prepMinutes: 15, icon: '🌶️', image: 'assets/media/dishes/mapo-tofu.jpg', tags: ['麻辣', '下饭'], available: true, todaySpecial: false, order: 3 },
  { id: 'dish_green_veg', categoryId: 'quick', name: '清炒时蔬', description: '当季青菜，清爽解腻', price: 15, prepMinutes: 10, icon: '🥬', image: 'assets/media/dishes/greens.jpg', tags: ['清淡', '当季'], available: true, todaySpecial: false, order: 4 },
  { id: 'dish_egg_fried_rice', categoryId: 'quick', name: '蛋炒饭', description: '粒粒分明，十分钟搞定', price: 15, prepMinutes: 10, icon: '🍚', image: 'assets/media/dishes/fried-rice.jpg', tags: ['家常'], available: true, todaySpecial: false, order: 5 },
  { id: 'dish_scallion_noodles', categoryId: 'quick', name: '葱油拌面', description: '葱香扑鼻，拌一拌就好', price: 18, prepMinutes: 12, icon: '🍜', image: 'assets/media/dishes/noodles.jpg', tags: ['葱香'], available: true, todaySpecial: false, order: 6 },
  { id: 'dish_tomato_egg_soup', categoryId: 'quick', name: '番茄蛋汤', description: '酸酸暖暖，先喝一口', price: 12, prepMinutes: 10, icon: '🍲', image: 'assets/media/dishes/tomato-soup.jpg', tags: ['暖胃'], available: true, todaySpecial: false, order: 7 },
  { id: 'dish_seaweed_soup', categoryId: 'quick', name: '紫菜蛋花汤', description: '清清淡淡，配饭刚好', price: 10, prepMinutes: 8, icon: '🥣', image: 'assets/media/dishes/seaweed-soup.jpg', tags: ['清淡'], available: true, todaySpecial: false, order: 8 },
  { id: 'dish_pear_soup', categoryId: 'quick', name: '冰糖雪梨', description: '润润喉咙，甜甜的', price: 12, prepMinutes: 20, icon: '🍐', image: 'assets/media/dishes/pear-soup.jpg', tags: ['清甜', '润喉'], available: true, todaySpecial: false, order: 9 },
  { id: 'dish_yogurt_fruit', categoryId: 'quick', name: '酸奶水果杯', description: '饭后的小甜头', price: 15, prepMinutes: 5, icon: '🍓', image: 'assets/media/dishes/yogurt.jpg', tags: ['清爽', '饭后'], available: true, todaySpecial: false, order: 10 },
  { id: 'dish_cola_wings', categoryId: 'hardcore', name: '可乐鸡翅', description: '甜甜咸咸，啃到停不下来', price: 35, prepMinutes: 25, icon: '🍗', image: 'assets/media/dishes/cola-wings.jpg', tags: ['甜口', '招牌'], available: true, todaySpecial: false, order: 11 },
  { id: 'dish_braised_pork', categoryId: 'hardcore', name: '红烧肉', description: '慢炖出来的硬菜，配米饭', price: 45, prepMinutes: 45, icon: '🥩', image: 'assets/media/dishes/braised-pork.jpg', tags: ['慢炖', '下饭'], available: true, todaySpecial: true, order: 12 },
  { id: 'dish_sweet_sour_ribs', categoryId: 'hardcore', name: '糖醋排骨', description: '酸甜挂汁，招牌之一', price: 42, prepMinutes: 40, icon: '🍖', image: 'assets/media/dishes/ribs.jpg', tags: ['酸甜', '招牌'], available: true, todaySpecial: false, order: 13 },
  { id: 'dish_dumplings', categoryId: 'hardcore', name: '手工饺子', description: '现包现煮，蘸醋最好吃', price: 28, prepMinutes: 30, icon: '🥟', image: 'assets/media/dishes/dumplings.jpg', tags: ['现包'], available: true, todaySpecial: false, order: 14 }
];

module.exports = { categories, dishes };
