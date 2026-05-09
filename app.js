App({
  globalData: {
    isAdmin: true,
    userInfo: { name: '张三', number: '10', position: '前锋' },
    matches: [
      { id: 1, date: '2026-05-15', time: '14:00', homeTeam: '厦门天涯足球队', awayTeam: '挑战者队', homeScore: 0, awayScore: 0, status: 'upcoming', locationName: '城市体育馆', locationAddress: '市中心大道123号' },
      { id: 2, date: '2026-05-10', time: '10:00', homeTeam: '厦门天涯足球队', awayTeam: '勇士队', homeScore: 3, awayScore: 2, status: 'finished', locationName: '体育中心', locationAddress: '体育路456号' },
      { id: 3, date: '2026-05-03', time: '15:30', homeTeam: '厦门天涯足球队', awayTeam: '雷霆队', homeScore: 1, awayScore: 1, status: 'finished', locationName: '足球场', locationAddress: '公园路789号' }
    ],
    location: { name: '城市体育馆', address: '市中心大道123号', latitude: 30.5728, longitude: 104.0668 },
    registeredPlayers: [{ id: 1, name: '张三', number: '10', position: '前锋' }, { id: 2, name: '李四', number: '7', position: '后卫' }, { id: 3, name: '王五', number: '15', position: '中场' }],
    leavePlayers: [{ id: 4, name: '赵六', number: '9', position: '前锋' }],
    profiles: [{ name: '张三', phone: '13800138001', number: '10', position: '前锋', height: '180', weight: '75', birthday: '1990-01-01', foot: 'right', bio: '热爱足球，擅长射门' }]
  }
})