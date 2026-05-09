const app = getApp()
Page({
  data: { matches: [] },
  onLoad: function() { this.setData({ matches: app.globalData.matches || [] }) },
  onShow: function() { this.setData({ matches: app.globalData.matches || [] }) }
})