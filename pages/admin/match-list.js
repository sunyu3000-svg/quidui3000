const app = getApp()
Page({
  data: { matches: [] },
  onLoad: function() { wx.setNavigationBarTitle({ title: '比赛管理' }) },
  onShow: function() { this.setData({ matches: app.globalData.matches || [] }) },
  editMatch: function(e) { wx.navigateTo({ url: `/pages/admin/publish-match?id=${e.currentTarget.dataset.id}` }) },
  deleteMatch: function(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({ title: '确认删除', content: '确定要删除这场比赛吗？', success: (res) => {
      if (res.confirm) {
        const m = (app.globalData.matches || []).filter(x => x.id !== id)
        app.globalData.matches = m
        this.setData({ matches: m })
        wx.showToast({ title: '已删除', icon: 'success' })
      }
    }})
  }
})