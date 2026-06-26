const db = wx.cloud.database()

Page({
  data: {
    activities: [],
    loading: true,
    isAdmin: true,  // 默认超级管理员
    showAddModal: false,
    showCalendar: false,
    userInfo: null,
    // 查询功能
    showSearch: false,
    searchMonth: '',
    // 时间筛选
    filterMonth: null,  // null表示本月，格式为 YYYY-MM
    newActivity: {
      title: '',
      date: '',
      timeValue: '',
      time: '',
      location: '',
      activityType: '',
      fee: '',
      description: '',
      maxPlayers: ''
    },
    todayDate: '',
    playerOptions: [
      { label: '12人', value: '12' },
      { label: '15人', value: '15' },
      { label: '18人', value: '18' },
      { label: '20人', value: '20' },
      { label: '22人', value: '22' }
    ],
    showTitleSuggestions: false,
    titleSuggestions: [],
    showLocationHistory: false,
    historyLocations: [],
    showActivityTypeHistory: false,
    historyActivityTypes: [],
    showFeeHistory: false,
    historyFees: [],
    showPlayerHistory: false,
    historyPlayers: [],
    historyTitles: []
  },

  onLoad: function() {
    this.setTodayDate()
    this.checkAdmin()
    this.loadUserInfo()
    this.initSearchDates()
  },
  
  loadUserInfo: function() {
    const that = this
    wx.getStorage({
      key: 'userInfo',
      success: function(res) {
        // console.log('signup: 从本地存储获取用户信息:', res.data)
        that.setData({ userInfo: res.data })
      },
      fail: function(err) {
        // console.log('signup: 本地存储无用户信息，尝试获取微信用户信息:', err)
        // 如果本地存储没有用户信息，尝试获取微信用户信息
        wx.getUserProfile({
          desc: '用于发布活动时记录发布者信息',
          success: function(res) {
            // console.log('signup: 获取微信用户信息成功:', res.userInfo)
            that.setData({ userInfo: res.userInfo })
            // 保存到本地存储
            wx.setStorage({ key: 'userInfo', data: res.userInfo })
          },
          fail: function(err2) {
            // console.log('signup: 获取微信用户信息失败:', err2)
            that.setData({ userInfo: null })
          }
        })
      }
    })
  },

  onShow: function() {
    // 重置筛选条件，确保默认显示当月所有活动（包含已结束活动）
    this.setData({ filterMonth: null })
    this.loadActivities()
  },

  setTodayDate: function() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    this.setData({ todayDate: `${year}-${month}-${day}` })
  },
  
  // 初始化查询日期
  initSearchDates: function() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    this.setData({
      searchMonth: `${year}-${month}-01`
    })
  },
  
  // 显示查询弹窗
  showSearchModal: function() {
    this.setData({ 
      showSearch: true,
      formattedSearchMonth: this.formatMonth(this.data.searchMonth)
    })
  },
  
  // 格式化年月显示（YYYY年MM月）
  formatMonth: function(dateStr) {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    return `${year}年${month}月`
  },
  
  // 关闭查询弹窗
  closeSearchModal: function() {
    this.setData({ showSearch: false })
  },
  
  // 选择年月（选择后立即执行查询）
  onMonthChange: function(e) {
    const value = e.detail.value
    this.setData({ 
      searchMonth: value,
      formattedSearchMonth: this.formatMonth(value)
    })
    
    // 选择后立即执行查询
    this.doSearch()
  },
  
  // 执行查询
  doSearch: function() {
    const { searchMonth } = this.data
    
    if (!searchMonth) {
      wx.showToast({
        title: '请选择年月',
        icon: 'none'
      })
      return
    }
    
    const date = new Date(searchMonth)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    
    // 获取当前年月
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    
    // 如果查询的是当月，不设置 filterMonth，使用默认逻辑（包含已结束活动）
    // 如果查询的是其他月份，设置 filterMonth（不添加模拟数据）
    const isCurrentMonth = year === currentYear && month === currentMonth
    const filterMonth = isCurrentMonth ? null : `${year}-${String(month).padStart(2, '0')}`
    
    this.setData({ 
      filterMonth: filterMonth,
      showSearch: false 
    })
    
    this.loadActivities(filterMonth)
    
    wx.showToast({
      title: `查询 ${year}年${month}月 的活动`,
      icon: 'none'
    })
  },

  checkAdmin: function() {
    // 设置为超级管理员
    // console.log('signup: 设置为超级管理员')
    this.setData({ isAdmin: true })
    this.loadActivities()
    return
    
    // 原有逻辑（已注释）
    // const that = this
    // wx.cloud.callFunction({
    //   name: 'getOpenId',
    //   success: function(res) {
    //     const openId = res.result.openid
    //     if (openId) {
    //       that.checkAdminByOpenId(openId)
    //     }
    //   },
    //   fail: function(err) {
    //     // console.log('getOpenId error:', err)
    //     that.loadActivities()
    //   }
    // })
  },

  checkAdminByOpenId: function(openId) {
    const that = this
    const timer = setTimeout(() => {
      that.loadActivities()
    }, 8000)
    
    db.collection('admins').where({
      openId: openId
    }).limit(1).get({
      timeout: 8000,
      success: function(res) {
        clearTimeout(timer)
        if (res.data.length > 0) {
          that.setData({ isAdmin: true })
        }
        that.loadActivities()
      },
      fail: function() {
        clearTimeout(timer)
        that.loadActivities()
      }
    })
  },

  loadActivities: function(filterMonth = null) {
    const that = this
    const timer = setTimeout(() => {
      // console.log('loadActivities: 查询超时')
      that.setData({ loading: false })
    }, 8000)
    
    // 使用传入的筛选条件（优先）或存储的筛选条件
    const currentFilter = filterMonth !== undefined ? filterMonth : this.data.filterMonth
    that.setData({ loading: true })
    
    // 获取日期筛选条件
    let query = db.collection('activities').limit(500)
    
    if (currentFilter) {
      // 如果指定了年月，查询该月的活动
      const [year, month] = currentFilter.split('-').map(Number)
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const endDate = new Date(year, month, 0).toISOString().split('T')[0]
      // console.log(`查询 ${year}年${month}月 的活动: ${startDate} ~ ${endDate}`)
      query = query.where({
        date: db.command.gte(startDate).and(db.command.lte(endDate))
      })
    } else {
      // 默认只显示本月活动，历史活动通过"历史活动"按钮查询
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      // console.log(`默认查询本月(${year}年${month}月)活动`)
      // 查询条件：日期 >= 本月初 或者 日期为空/不存在（空日期视为本月活动）
      query = query.where(db.command.or([
        { date: db.command.gte(startDate) },
        { date: '' },
        { date: db.command.exists(false) }
      ]))
    }
    
    // 先按状态排序（报名中优先），再按发布时间排序（最近发布的最上面）
    query.orderBy('status', 'asc').orderBy('createTime', 'desc').get({
      timeout: 8000,
      success: function(res) {
        clearTimeout(timer)
        // console.log('loadActivities success:', res)
        // 仅使用数据库真实数据，不添加任何模拟数据
        let activities = res.data || []
        
        // 获取本周的日期（用于填充无日期的活动）
        const now = new Date()
        const dayOfWeek = now.getDay()
        const daysUntilSaturday = dayOfWeek === 0 ? 6 : 6 - dayOfWeek
        const saturday = new Date(now)
        saturday.setDate(now.getDate() + daysUntilSaturday)
        const defaultDate = saturday.toISOString().split('T')[0]
        
        // 获取今天的日期（用于判断活动是否过期）
        const today = now.toISOString().split('T')[0]
        
        // 转换状态显示，无日期的活动使用本周六日期
        activities = activities.map(item => {
          const activityDate = item.date || defaultDate
          // 判断活动是否已经过期（日期早于今天）
          const isExpired = activityDate < today
          
          let status = item.status
          // 如果活动日期已经过去，强制设置为"已结束"
          if (isExpired) {
            status = 'ended'
          }
          
          return {
            ...item,
            date: activityDate,
            status: status === 'active' ? '报名中' : (status === 'ended' || status === 'expired' ? '已结束' : (status === 'cancelled' ? '已取消' : status))
          }
        })
        
        // 活动列表排序：已结束的放最下面，报名中的按时间排序（时间越近越靠前）
        activities.sort((a, b) => {
          // 解析活动日期
          const dateA = new Date(a.date)
          const dateB = new Date(b.date)
          
          // 已结束的活动放在下面
          const statusA = a.status === '报名中' ? 0 : 1
          const statusB = b.status === '报名中' ? 0 : 1
          
          if (statusA !== statusB) {
            return statusA - statusB
          }
          
          // 同状态下，报名中的活动日期越近越靠前，已结束的活动日期越晚越靠前
          return dateA - dateB
        })
        
        // 活动数量限制：最多显示10个活动
        const MAX_ACTIVITIES = 10
        
        if (activities.length > MAX_ACTIVITIES) {
          // console.log('活动数量超过限制，需要删除旧活动:', activities.length)
          
          // 获取需要删除的活动（最早结束的活动）
          const activitiesToDelete = activities.slice(MAX_ACTIVITIES)
          activities = activities.slice(0, MAX_ACTIVITIES)
          
          // console.log('需要删除的活动:', activitiesToDelete)
          
          // 删除最早结束的活动
          activitiesToDelete.forEach(activity => {
            db.collection('activities').doc(activity._id).remove({
              success: function() {
                // console.log('已删除旧活动:', activity.title)
              },
              fail: function(err) {
                // console.error('删除旧活动失败:', err)
              }
            })
          })
        }
        
        that.setData({
          activities: activities,
          loading: false
        })
        
        that.updateSignupCount()
      },
      fail: function(err) {
        // console.error('loadActivities fail:', err)
        that.setData({
          activities: [{
            _id: '1',
            id: '1',
            title: '周六友谊赛',
            time: '周六 晚上 8:00',
            location: '五缘湾足球场',
            description: '本周六晚上8点，五缘湾足球场，欢迎大家报名参加！',
            maxPlayers: 15,
            status: '报名中',
            createTime: new Date()
          }],
          loading: false
        })
      }
    })
  },

  updateSignupCount: function() {
    const that = this
    const activities = this.data.activities
    
    // 先查询所有报名记录，然后在客户端匹配活动
    db.collection('signups').limit(500).get({
      success: function(res) {
        const allSignups = res.data || []
        
        // 先遍历所有报名记录，按activityId分组（只统计已报名状态，排除待定和请假）
        const signupByActivity = new Map()
        allSignups.forEach(signup => {
          // 过滤掉待定和请假状态的报名记录
          if (signup.status === 'pending' || signup.status === 'leave') return
          
          const activityId = signup.activityId
          if (!signupByActivity.has(activityId)) {
            signupByActivity.set(activityId, new Set())
          }
          const userKey = signup.userId || signup.nickName || signup._id
          signupByActivity.get(activityId).add(userKey)
        })
        
        // 然后更新每个活动的报名人数
        activities.forEach((activity, index) => {
          let signupCount = 0
          const possibleIds = []
          if (activity._id) possibleIds.push(activity._id)
          if (activity.id && activity.id !== activity._id) possibleIds.push(activity.id)
          
          // 检查所有可能的活动ID
          possibleIds.forEach(id => {
            if (signupByActivity.has(id)) {
              signupCount += signupByActivity.get(id).size
            }
          })
          
          activities[index].signupCount = signupCount
        })
        
        that.setData({ activities: activities })
      },
      fail: function(err) {
        console.error('updateSignupCount: 查询报名记录失败', err)
        // 查询失败时，保持原有数据不变
      }
    })
  },

  goToDetail: function(e) {
    const activity = e.currentTarget.dataset.activity
    const activityId = activity.id || activity._id
    
    // 统一转换为英文状态值，避免中文编码问题
    let status = activity.status || 'active'
    if (status === '报名中') {
      status = 'active'
    } else if (status === '已结束') {
      status = 'ended'
    } else if (status === '已取消') {
      status = 'cancelled'
    }
    
    // 传递活动详细信息，确保详情页显示一致
    // 同时传递 id 和 _id，确保查询报名记录时使用正确的ID
    let url = `/pages/detail/detail?id=${activityId}&title=${encodeURIComponent(activity.title)}&status=${encodeURIComponent(status)}&date=${encodeURIComponent(activity.date || '')}&time=${encodeURIComponent(activity.time || '')}&location=${encodeURIComponent(activity.location || '')}&maxPlayers=${activity.maxPlayers || 21}`
    
    // 如果有 _id，也传递过去
    if (activity._id) {
      url += `&_id=${encodeURIComponent(activity._id)}`
    }
    
    wx.navigateTo({
      url: url
    })
  },

  showAddActivityModal: function() {
    this.setData({ showAddModal: true })
    this.loadHistoryFromDb()
  },

  closeAddModal: function() {
    this.setData({
      showAddModal: false,
      showCalendar: false,
      showTitleSuggestions: false,
      titleSuggestions: [],
      showLocationHistory: false,
      showActivityTypeHistory: false,
      showFeeHistory: false,
      showPlayerHistory: false,
      newActivity: {
        title: '',
        date: '',
        timeValue: '',
        time: '',
        location: '',
        activityType: '',
        fee: '',
        description: '',
        maxPlayers: ''
      }
    })
  },

  objectEntries: function(obj) {
    const entries = []
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        entries.push([key, obj[key]])
      }
    }
    return entries
  },

  loadHistoryFromDb: function() {
    const that = this
    const timer = setTimeout(() => {
      // console.log('loadHistoryFromDb: 查询超时')
    }, 8000)
    
    db.collection('activities').limit(500).get({
      timeout: 8000,
      success: function(res) {
        clearTimeout(timer)
        const history = {}
        if (res && res.data) {
          res.data.forEach(item => {
            history['title'] = history['title'] || {}
            history['location'] = history['location'] || {}
            history['activityType'] = history['activityType'] || {}
            history['fee'] = history['fee'] || {}
            history['maxPlayers'] = history['maxPlayers'] || {}
            
            history['title'][item.title] = (history['title'][item.title] || 0) + 1
            history['location'][item.location] = (history['location'][item.location] || 0) + 1
            history['activityType'][item.activityType] = (history['activityType'][item.activityType] || 0) + 1
            history['fee'][item.fee] = (history['fee'][item.fee] || 0) + 1
            history['maxPlayers'][item.maxPlayers] = (history['maxPlayers'][item.maxPlayers] || 0) + 1
          })
        }
        
        const titles = that.objectEntries(history['title'] || {})
        const locations = that.objectEntries(history['location'] || {})
        const activityTypes = that.objectEntries(history['activityType'] || {})
        const fees = that.objectEntries(history['fee'] || {})
        const players = that.objectEntries(history['maxPlayers'] || {})
        
        that.setData({
          historyTitles: titles.map(function(arr) { return arr ? { value: arr[0] || '', count: arr[1] || 0 } : { value: '', count: 0 } }).sort(function(a, b) { return b.count - a.count }),
          historyLocations: locations.map(function(arr) { return arr ? { value: arr[0] || '', count: arr[1] || 0 } : { value: '', count: 0 } }).sort(function(a, b) { return b.count - a.count }),
          historyActivityTypes: activityTypes.map(function(arr) { return arr ? { value: arr[0] || '', count: arr[1] || 0 } : { value: '', count: 0 } }).sort(function(a, b) { return b.count - a.count }),
          historyFees: fees.map(function(arr) { return arr ? { value: arr[0] || '', count: arr[1] || 0 } : { value: '', count: 0 } }).sort(function(a, b) { return b.count - a.count }),
          historyPlayers: players.map(function(arr) { return arr ? { value: String(arr[0] || ''), count: arr[1] || 0 } : { value: '', count: 0 } }).sort(function(a, b) { return b.count - a.count })
        })
      },
      fail: function() {
        // 查询失败时使用空数据
        that.setData({
          historyTitles: [],
          historyLocations: [],
          historyActivityTypes: [],
          historyFees: [],
          historyPlayers: []
        })
      }
    })
  },

  showTitleSuggestions: function() {
    const { historyTitles } = this.data
    this.setData({
      showTitleSuggestions: true,
      titleSuggestions: historyTitles.slice(0, 5)
    })
  },

  selectSuggestion: function(e) {
    const field = e.currentTarget.dataset.field
    const value = e.currentTarget.dataset.value
    this.setData({
      [`newActivity.${field}`]: value,
      showTitleSuggestions: false,
      titleSuggestions: []
    })
  },

  openCalendar: function() {
    this.setData({ showCalendar: true })
  },

  closeCalendar: function() {
    this.setData({ showCalendar: false })
  },

  onCalendarSelect: function(e) {
    const date = e.detail.date
    this.setData({
      'newActivity.date': date,
      showCalendar: false
    })
    this.updateTimeText()
  },

  onTimeChange: function(e) {
    this.setData({ 'newActivity.timeValue': e.detail.value })
    this.updateTimeText()
  },

  updateTimeText: function() {
    const { newActivity } = this.data
    if (newActivity.date && newActivity.timeValue) {
      const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      const date = new Date(newActivity.date)
      const weekDay = weekDays[date.getDay()]
      const time = newActivity.timeValue
      this.setData({
        'newActivity.time': `${weekDay} ${time}`
      })
    }
  },

  chooseLocation: function() {
    const that = this
    wx.chooseLocation({
      success: function(res) {
        // 保存完整地址：name（地点名称） + address（省市区街道）
        let fullAddress = ''
        if (res.name) fullAddress += res.name
        if (res.address && res.address !== res.name) {
          if (fullAddress) fullAddress += ' '
          fullAddress += res.address
        }
        fullAddress = fullAddress || '未知地点'
        
        that.setData({
          'newActivity.location': fullAddress,
          'newActivity.latitude': res.latitude,
          'newActivity.longitude': res.longitude
        })
      },
      fail: function(err) {
        // console.error('选择地点失败:', err)
        if (err.errMsg && err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '提示',
            content: '请在系统设置中开启位置权限',
            showCancel: false
          })
        } else if (err.errMsg && err.errMsg.includes('cancel')) {
          // 用户取消选择，不做处理
        } else {
          wx.showToast({
            title: '选择地点失败',
            icon: 'none'
          })
        }
      }
    })
  },

  onActivityTitleInput: function(e) {
    this.setData({ 'newActivity.title': e.detail.value })
  },

  onActivityLocationInput: function(e) {
    this.setData({ 'newActivity.location': e.detail.value })
  },

  onLocationFocus: function() {
    this.closeAllDropdowns()
    this.setData({ showLocationHistory: true })
  },

  onActivityTypeInput: function(e) {
    this.setData({ 'newActivity.activityType': e.detail.value })
  },

  onActivityTypeFocus: function() {
    this.closeAllDropdowns()
    this.setData({ showActivityTypeHistory: true })
  },

  onActivityFeeInput: function(e) {
    this.setData({ 'newActivity.fee': e.detail.value })
  },

  onFeeFocus: function() {
    this.closeAllDropdowns()
    this.setData({ showFeeHistory: true })
  },

  onActivityDescInput: function(e) {
    this.setData({ 'newActivity.description': e.detail.value })
  },

  onActivityMaxPlayersInput: function(e) {
    this.setData({ 'newActivity.maxPlayers': e.detail.value })
  },

  showPlayerHistoryTap: function() {
    this.closeAllDropdowns()
    this.setData({ showPlayerHistory: true })
  },

  selectLocation: function(e) {
    this.setData({
      'newActivity.location': e.currentTarget.dataset.value,
      showLocationHistory: false
    })
  },

  selectActivityType: function(e) {
    this.setData({
      'newActivity.activityType': e.currentTarget.dataset.value,
      showActivityTypeHistory: false
    })
  },

  selectFee: function(e) {
    this.setData({
      'newActivity.fee': e.currentTarget.dataset.value,
      showFeeHistory: false
    })
  },

  selectPlayers: function(e) {
    this.setData({
      'newActivity.maxPlayers': e.currentTarget.dataset.value,
      showPlayerHistory: false
    })
  },

  closeAllDropdowns: function() {
    this.setData({
      showLocationHistory: false,
      showActivityTypeHistory: false,
      showFeeHistory: false,
      showPlayerHistory: false,
      showTitleSuggestions: false
    })
  },

  stopPropagation: function(e) {
    // 阻止事件冒泡
    if (e && e.stopPropagation) {
      e.stopPropagation()
    }
  },

  addActivity: function() {
    const { newActivity } = this.data
    
    if (!newActivity.title) {
      wx.showToast({ title: '请输入活动标题', icon: 'none' })
      return
    }
    if (!newActivity.date || !newActivity.timeValue) {
      wx.showToast({ title: '请选择活动时间', icon: 'none' })
      return
    }
    if (!newActivity.location) {
      wx.showToast({ title: '请输入活动地点', icon: 'none' })
      return
    }
    if (!newActivity.activityType) {
      wx.showToast({ title: '请输入活动类型', icon: 'none' })
      return
    }
    if (!newActivity.fee) {
      wx.showToast({ title: '请输入收费标准', icon: 'none' })
      return
    }
    if (!newActivity.maxPlayers) {
      wx.showToast({ title: '请输入最大人数', icon: 'none' })
      return
    }

    const that = this
    const userInfo = this.data.userInfo || {}
    const activityData = {
      title: newActivity.title,
      date: newActivity.date,
      timeValue: newActivity.timeValue,
      time: newActivity.time,
      location: newActivity.location,
      latitude: newActivity.latitude || 24.4798,
      longitude: newActivity.longitude || 118.0894,
      activityType: newActivity.activityType,
      fee: newActivity.fee,
      description: newActivity.description || '暂无描述',
      maxPlayers: parseInt(newActivity.maxPlayers),
      status: 'active',
      createTime: new Date(),
      organizer: userInfo.nickName || '未知用户',
      organizerAvatar: userInfo.avatarUrl || ''
    }

    db.collection('activities').add({
      data: activityData,
      success: function(res) {
        // console.log('addActivity success:', res)
        wx.showToast({ title: '发布成功', icon: 'success' })
        that.closeAddModal()
        that.loadActivities()
      },
      fail: function(err) {
        // console.error('addActivity fail:', err)
        wx.showToast({ title: '发布失败', icon: 'none' })
      }
    })
  }
})