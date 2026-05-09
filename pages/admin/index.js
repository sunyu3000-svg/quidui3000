const app = getApp()
Page({
  data: { stats: { matchCount: 0, playerCount: 0, registeredCount: 0 } },
  onLoad: function() { wx.setNavigationBarTitle({ title: '管理中心' }) },
  onShow: function() { this.loadStats() },
  loadStats: function() {
    const g = app.globalData
    this.setData({ stats: { matchCount: (g.matches || []).length, playerCount: (g.profiles || []).length, registeredCount: (g.registeredPlayers || []).length } })
  },
  goToPublishMatch: function() { wx.navigateTo({ url: '/pages/admin/publish-match' }) },
  goToMatchList: function() { wx.navigateTo({ url: '/pages/admin/match-list' }) },
  goToPlayerList: function() { wx.navigateTo({ url: '/pages/admin/player-list' }) },
  goToRegisterManage: function() { wx.switchTab({ url: '/pages/register/register' }) },
  goToStats: function() { wx.navigateTo({ url: '/pages/stats/stats' }) },
  clearCache: function() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有本地数据吗？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          app.globalData = {
            isAdmin: true,
            userInfo: { name: '张三', number: '10', position: '前锋' },
            matches: [],
            location: { name: '城市体育馆', address: '市中心大道123号', latitude: 30.5728, longitude: 104.0668 },
            registeredPlayers: [],
            leavePlayers: [],
            profiles: []
          }
          wx.showToast({ title: '缓存已清除', icon: 'success' })
          this.loadStats()
        }
      }
    })
  },
  exportData: function() {
    const data = JSON.stringify(app.globalData, null, 2)
    wx.setClipboardData({
      data: data,
      success: () => {
        wx.showToast({ title: '数据已复制', icon: 'success' })
      }
    })
  }
})