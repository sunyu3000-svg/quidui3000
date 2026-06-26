App({
  onLaunch: function() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      wx.showToast({
        title: '云能力不可用',
        icon: 'none',
        duration: 3000
      })
    } else {
      console.log('云开发初始化...')
      wx.cloud.init({
        env: 'cloudbase-d4gt5hha52e0ea86b',
        traceUser: true
      })
      console.log('云开发初始化完成')
    }
    
    this.globalData = {}
  },
  
  globalData: {}
})