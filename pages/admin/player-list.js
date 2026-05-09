const app = getApp()
Page({
  data: { players: [] },
  onLoad: function() { wx.setNavigationBarTitle({ title: '球员管理' }) },
  onShow: function() { this.setData({ players: app.globalData.profiles || [] }) },
  footText: function(f) {
    if (f === 'left') return '左脚'
    if (f === 'right') return '右脚'
    if (f === 'both') return '双脚'
    return ''
  },
  callPlayer: function(e) {
    const p = e.currentTarget.dataset.phone
    if (p) {
      wx.makePhoneCall({
        phoneNumber: p,
        fail: () => wx.showToast({ title: '拨打电话失败', icon: 'none' })
      })
    } else {
      wx.showToast({ title: '该球员未填写电话', icon: 'none' })
    }
  }
})