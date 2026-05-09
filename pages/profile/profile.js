const app = getApp()
Page({
  data: { userInfo: {}, myProfile: {}, footText: '', myStats: { attendance: 0, leave: 0, rate: 0 } },
  onLoad: function() { this.setData({ userInfo: app.globalData.userInfo }) },
  onShow: function() { this.loadProfile(); this.calculateMyStats() },
  loadProfile: function() {
    const p = app.globalData.profiles || []
    const u = app.globalData.userInfo
    const mp = u && u.name ? p.find(x => x.name === u.name) || {} : {}
    let ft = ''
    if (mp.foot === 'left') ft = '左脚'
    else if (mp.foot === 'right') ft = '右脚'
    else if (mp.foot === 'both') ft = '双脚'
    this.setData({ myProfile: mp, userInfo: u, footText: ft })
  },
  calculateMyStats: function() {
    const name = this.data.userInfo.name
    const m = app.globalData.matches || []
    const r = app.globalData.registeredPlayers || []
    const l = app.globalData.leavePlayers || []
    const year = new Date().getFullYear()
    const ym = m.filter(x => new Date(x.date).getFullYear() === year)
    const rc = r.filter(x => x.name === name).length
    const lc = l.filter(x => x.name === name).length
    const rate = ym.length > 0 ? Math.round((rc / ym.length) * 100) : 0
    this.setData({ myStats: { attendance: rc, leave: lc, rate: rate } })
  },
  goToEdit: function() {
    wx.showToast({ title: '编辑功能开发中', icon: 'none' })
  },
  goToMatches: function() { wx.switchTab({ url: '/pages/matches/matches' }) },
  goToRegister: function() { wx.switchTab({ url: '/pages/register/register' }) },
  goToStats: function() { wx.navigateTo({ url: '/pages/stats/stats' }) },
  checkAdmin: function() {
    if (app.globalData.isAdmin) {
      wx.navigateTo({ url: '/pages/admin/index' })
    } else {
      wx.showModal({ title: '提示', content: '您没有管理员权限', showCancel: false })
    }
  }
})