const app = getApp()
Page({
  data: { nextMatch: null, stats: { playerCount: 0, matchCount: 0, registeredCount: 0 } },
  onLoad: function() { this.loadData() },
  loadData: function() {
    const g = app.globalData
    const m = g.matches || []
    this.setData({
      nextMatch: m.find(x => x.status === 'upcoming') || m[0],
      stats: { playerCount: (g.profiles || []).length, matchCount: m.length, registeredCount: (g.registeredPlayers || []).length }
    })
  },
  goToMatches: function() { wx.switchTab({ url: '/pages/matches/matches' }) },
  goToRegister: function() { wx.switchTab({ url: '/pages/register/register' }) }
})