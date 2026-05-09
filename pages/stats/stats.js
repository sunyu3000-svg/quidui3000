const app = getApp()
Page({
  data: {
    teamStats: { totalMatches: 0, totalPlayers: 0, winCount: 0, drawCount: 0, lossCount: 0, winRate: 0, locations: [], avgRegistered: 0, avgAttendanceRate: 0, totalRegistrations: 0 },
    playerRanking: []
  },
  onLoad: function() {
    wx.setNavigationBarTitle({ title: '球队统计' })
    this.calculateStats()
  },
  calculateStats: function() {
    const m = app.globalData.matches || []
    const p = app.globalData.profiles || []
    const r = app.globalData.registeredPlayers || []
    const year = new Date().getFullYear()
    const ym = m.filter(x => new Date(x.date).getFullYear() === year)
    const fm = ym.filter(x => x.status === 'finished')
    
    let w = 0, d = 0, l = 0
    fm.forEach(x => { if (x.homeScore > x.awayScore) w++; else if (x.homeScore === x.awayScore) d++; else l++ })
    
    const locMap = {}
    ym.forEach(x => { const loc = x.locationName || '未指定'; locMap[loc] = (locMap[loc] || 0) + 1 })
    const locs = Object.keys(locMap).map(n => ({ name: n, count: locMap[n] })).sort((a, b) => b.count - a.count)
    
    const tr = ym.length * r.length
    const ar = ym.length > 0 ? Math.round(tr / ym.length) : 0
    const aar = p.length > 0 ? Math.round((r.length / p.length) * 100) : 0
    
    const pa = p.map(x => {
      const att = r.filter(y => y.name === x.name).length
      return { name: x.name, attendance: att, total: ym.length, rate: ym.length > 0 ? Math.round((att / ym.length) * 100) : 0 }
    }).sort((a, b) => b.rate - a.rate).slice(0, 10).map((x, i) => ({ ...x, rank: i + 1 }))
    
    this.setData({
      teamStats: { totalMatches: ym.length, totalPlayers: p.length, winCount: w, drawCount: d, lossCount: l, winRate: fm.length > 0 ? Math.round((w / fm.length) * 100) : 0, locations: locs, avgRegistered: ar, avgAttendanceRate: aar, totalRegistrations: tr },
      playerRanking: pa
    })
  },
  getRankColor: function(r) {
    switch(r) { case 1: return '#fbbf24'; case 2: return '#9ca3af'; case 3: return '#d97706'; default: return '#e5e7eb' }
  },
  shareToTimeline: function() {
    const stats = this.data.teamStats
    const shareData = {
      title: `厦门天涯足球队年度统计`,
      desc: `今年共进行${stats.totalMatches}场比赛，胜率${stats.winRate}%，平均每场${stats.avgRegistered}人报名`,
      path: '/pages/stats/stats'
    }
    
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
    
    wx.showToast({ title: '已开启分享', icon: 'success' })
  },
  onShareAppMessage: function() {
    const stats = this.data.teamStats
    return {
      title: `厦门天涯足球队年度统计`,
      desc: `今年共进行${stats.totalMatches}场比赛，胜率${stats.winRate}%`,
      path: '/pages/stats/stats'
    }
  },
  onShareTimeline: function() {
    const stats = this.data.teamStats
    return {
      title: `厦门天涯足球队：今年${stats.totalMatches}场比赛，胜率${stats.winRate}%`,
      query: '',
      imageUrl: ''
    }
  }
})