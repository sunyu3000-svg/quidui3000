App({
  onLaunch: function() {
    if (!wx.cloud) {
      wx.showToast({
        title: '云能力不可用',
        icon: 'none',
        duration: 3000
      })
    } else {
      wx.cloud.init({
        env: 'cloudbase-d4gt5hha52e0ea86b',
        traceUser: true
      })
    }
    
    this.globalData = {}
  },
  
  globalData: {}
})