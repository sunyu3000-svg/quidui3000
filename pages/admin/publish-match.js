const app = getApp()
Page({
  data: { isEdit: false, editId: null, formData: { date: '', time: '', homeTeam: '厦门天涯足球队', awayTeam: '', locationName: '', locationAddress: '', description: '' } },
  onLoad: function(options) {
    if (options.id) {
      this.setData({ isEdit: true, editId: parseInt(options.id) })
      wx.setNavigationBarTitle({ title: '编辑比赛' })
      this.loadMatch()
    } else {
      wx.setNavigationBarTitle({ title: '发布比赛' })
    }
  },
  loadMatch: function() {
    const m = app.globalData.matches.find(x => x.id === this.data.editId)
    if (m) this.setData({ formData: { date: m.date, time: m.time, homeTeam: m.homeTeam, awayTeam: m.awayTeam, locationName: m.locationName || '', locationAddress: m.locationAddress || '', description: m.description || '' } })
  },
  onInput: function(e) { this.setData({ [`formData.${e.currentTarget.dataset.field}`]: e.detail.value }) },
  onDateChange: function(e) { this.setData({ 'formData.date': e.detail.value }) },
  onTimeChange: function(e) { this.setData({ 'formData.time': e.detail.value }) },
  publishMatch: function() {
    const f = this.data.formData
    if (!f.date || !f.time || !f.homeTeam || !f.awayTeam || !f.locationName || !f.locationAddress) {
      wx.showToast({ title: '请填写带 * 的必填项', icon: 'none' }); return
    }
    const m = app.globalData.matches || []
    if (this.data.isEdit) {
      const i = m.findIndex(x => x.id === this.data.editId)
      if (i >= 0) m[i] = { ...m[i], ...f, status: m[i].status }
    } else {
      m.unshift({ id: Date.now(), ...f, homeScore: 0, awayScore: 0, status: 'upcoming' })
    }
    app.globalData.matches = m
    wx.showToast({ title: this.data.isEdit ? '修改成功' : '发布成功', icon: 'success', success: () => setTimeout(() => wx.navigateBack(), 1500) })
  },
  cancel: function() { wx.navigateBack() }
})