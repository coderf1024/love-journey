/* Weekend serving windows: Sat/Sun 12:00 & 20:00, bookable two weekends ahead. */
module.exports = {
  slots: [
    { id: 'sat-lunch', day: 6, time: '12:00', label: '午餐', emoji: '☀️' },
    { id: 'sat-dinner', day: 6, time: '20:00', label: '晚餐', emoji: '🌙' },
    { id: 'sun-lunch', day: 0, time: '12:00', label: '午餐', emoji: '☀️' },
    { id: 'sun-dinner', day: 0, time: '20:00', label: '晚餐', emoji: '🌙' }
  ],
  weeksAhead: 2,
  cutoffMinutes: 60,
  timezone: 'Asia/Shanghai'
};
