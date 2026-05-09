const app = getApp()
Page({
  data: { userInfo: {}, nextMatch: {}, location: {}, registeredPlayers: [], leavePlayers: [], userStatus: 'not_registered', isAdmin: false, showAddModal: false, newPlayer: { name: '', number: '', position: '' }, positions: ['前锋', '中场', '后卫', '守门员'] },
  onLoad: function() {
    const g = app.globalData
    const m = g.matches || []
    this.setData({ 
      userInfo: g.userInfo, 
      nextMatch: m.find(x => x.status === 'upcoming') || m[0], 
      location: g.location, 
      registeredPlayers: g.registeredPlayers || [], 
      leavePlayers: g.leavePlayers || [], 
      isAdmin: g.isAdmin 
    })
    this.checkUserStatus()
  },
  checkUserStatus: function() {
    const name = this.data.userInfo.name
    const reg = this.data.registeredPlayers.some(p => p.name === name)
    const leave = this.data.leavePlayers.some(p => p.name === name)
    this.setData({ userStatus: leave ? 'leave' : reg ? 'registered' : 'not_registered' })
  },
  register: function() {
    const u = this.data.userInfo
    const r = [...this.data.registeredPlayers, { id: Date.now(), name: u.name, number: u.number, position: u.position }]
    app.globalData.registeredPlayers = r
    this.setData({ registeredPlayers: r, userStatus: 'registered' })
    wx.showToast({ title: '报名成功', icon: 'success' })
  },
  cancelRegistration: function() {
    const r = this.data.registeredPlayers.filter(p => p.name !== this.data.userInfo.name)
    app.globalData.registeredPlayers = r
    this.setData({ registeredPlayers: r, userStatus: 'not_registered' })
    wx.showToast({ title: '已取消报名', icon: 'success' })
  },
  toggleLeave: function() {
    const u = this.data.userInfo
    if (this.data.userStatus === 'registered') {
      const l = [...this.data.leavePlayers, { id: Date.now(), name: u.name, number: u.number, position: u.position }]
      const r = this.data.registeredPlayers.filter(p => p.name !== u.name)
      app.globalData.leavePlayers = l; app.globalData.registeredPlayers = r
      this.setData({ leavePlayers: l, registeredPlayers: r, userStatus: 'leave' })
      wx.showToast({ title: '已请假', icon: 'success' })
    } else if (this.data.userStatus === 'leave') {
      const r = [...this.data.registeredPlayers, { id: Date.now(), name: u.name, number: u.number, position: u.position }]
      const l = this.data.leavePlayers.filter(p => p.name !== u.name)
      app.globalData.registeredPlayers = r; app.globalData.leavePlayers = l
      this.setData({ registeredPlayers: r, leavePlayers: l, userStatus: 'registered' })
      wx.showToast({ title: '已取消请假', icon: 'success' })
    }
  },
  showAddPlayerModal: function() { this.setData({ showAddModal: true, newPlayer: { name: '', number: '', position: '' } }) },
  hideAddPlayerModal: function() { this.setData({ showAddModal: false }) },
  stopPropagation: function() {},
  onAddPlayerInput: function(e) { this.setData({ [`newPlayer.${e.currentTarget.dataset.field}`]: e.detail.value }) },
  onPositionChange: function(e) { this.setData({ 'newPlayer.position': this.data.positions[e.detail.value] }) },
  addPlayer: function() {
    const p = this.data.newPlayer
    if (!p.name || !p.number || !p.position) { wx.showToast({ title: '请填写完整信息', icon: 'none' }); return }
    if (this.data.registeredPlayers.some(x => x.name === p.name)) { wx.showToast({ title: '该球员已报名', icon: 'none' }); return }
    const r = [...this.data.registeredPlayers, { id: Date.now(), name: p.name, number: p.number, position: p.position }]
    app.globalData.registeredPlayers = r
    this.setData({ registeredPlayers: r, showAddModal: false, newPlayer: { name: '', number: '', position: '' } })
    wx.showToast({ title: '添加成功', icon: 'success' })
  },
  removePlayer: function(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({ title: '确认删除', content: '确定要取消该球员的报名吗？', success: (res) => {
      if (res.confirm) {
        const r = this.data.registeredPlayers.filter(p => p.id != id)
        app.globalData.registeredPlayers = r
        this.setData({ registeredPlayers: r })
        wx.showToast({ title: '删除成功', icon: 'success' })
      }
    }})
  },
  shareToChat: function() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage']
    })
    
    wx.showToast({ title: '已开启分享', icon: 'success' })
  },
  onShareAppMessage: function() {
    const match = this.data.nextMatch
    return {
      title: `快来报名！${match.homeTeam} VS ${match.awayTeam}`,
      desc: `${match.date} ${match.time} · ${match.locationName || this.data.location.name}`,
      path: '/pages/register/register'
    }
  }
})