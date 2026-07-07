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
    historyTitles: [],
    isEditing: false,
    editingId: ''
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
    const that = this
    wx.cloud.callFunction({
      name: 'getOpenId',
      success: function(res) {
        const openId = res.result.openid
        if (openId) {
          that.checkAdminByOpenId(openId)
        } else {
          that.setData({ isAdmin: false })
          that.loadActivities()
        }
      },
      fail: function(err) {
        that.setData({ isAdmin: false })
        that.loadActivities()
      }
    })
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
      // 使用本地日期计算月末，避免 toISOString 时区偏移导致月末日期错误
      const endDateObj = new Date(year, month, 0)
      const endDate = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`
      query = query.where({
        date: db.command.gte(startDate).and(db.command.lte(endDate))
      })
    } else {
      // 默认只显示本月活动，历史活动通过"历史活动"按钮查询
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      // 使用本地日期计算月末，避免 toISOString 时区偏移导致月末日期错误
      const endDateObj = new Date(year, month, 0)
      const endDate = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`
      query = query.where({
        date: db.command.gte(startDate).and(db.command.lte(endDate))
      })
    }
    query = query.orderBy('status', 'asc').orderBy('createTime', 'desc').get({
      timeout: 8000,
      success: function(res) {
        clearTimeout(timer)
        let activities = res.data || []
        
        // 获取本周六的日期（用于填充无日期的活动）
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
            status: status === 'active' ? '报名中' : (status === 'ended' || status === 'expired' ? '已结束' : (status === 'cancelled' ? '已取消' : status)),
            slideX: 0
          }
        })
        
        // 活动列表排序：报名中放最上面，已结束放下面，各自内部按距今天数升序（近的在上）
        const todayTime = new Date(today).getTime()
        activities.sort((a, b) => {
          const statusA = a.status === '报名中' ? 0 : 1
          const statusB = b.status === '报名中' ? 0 : 1
          
          if (statusA !== statusB) {
            return statusA - statusB
          }
          
          // 同状态下，按日期与今天的绝对差值升序（离今天最近的在前）
          const diffA = Math.abs(new Date(a.date).getTime() - todayTime)
          const diffB = Math.abs(new Date(b.date).getTime() - todayTime)
          return diffA - diffB
        })
        
        // 前端限制：最多显示10个活动（不删除数据库，只在前端限制显示）
        const MAX_ACTIVITIES = 10
        const displayActivities = activities.length > MAX_ACTIVITIES 
          ? activities.slice(0, MAX_ACTIVITIES) 
          : activities
        
        that.setData({
          activities: displayActivities,
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
    
    if (!activities || activities.length === 0) return
    
    // 收集所有活动的ID（同时收集 _id 和 id，兼容不同存储方式）
    const allIds = new Set()
    activities.forEach(activity => {
      if (activity._id) allIds.add(activity._id)
      if (activity.id && activity.id !== activity._id) allIds.add(activity.id)
    })
    
    const ids = [...allIds]
    if (ids.length === 0) return
    
    // 精确查询：只查这些活动ID的报名记录，排除待定和请假
    db.collection('signups').where({
      activityId: ids.length === 1 ? ids[0] : db.command.in(ids),
      status: db.command.nin(['pending', 'leave'])
    }).get({
      success: function(res) {
        const allSignups = res.data || []
        
        // 按 activityId 统计报名人数（去重）
        const countById = new Map()
        allSignups.forEach(signup => {
          const id = signup.activityId
          if (!countById.has(id)) {
            countById.set(id, new Set())
          }
          const userKey = signup.userId || signup.nickName || signup._id
          countById.get(id).add(userKey)
        })
        
        // 更新每个活动的报名人数
        const updatedActivities = activities.map(activity => {
          let count = 0
          if (activity._id && countById.has(activity._id)) {
            count += countById.get(activity._id).size
          }
          if (activity.id && activity.id !== activity._id && countById.has(activity.id)) {
            count += countById.get(activity.id).size
          }
          return { ...activity, signupCount: count }
        })
        
        that.setData({ activities: updatedActivities })
      },
      fail: function() {
        // 查询失败时，保持原有数据不变
      }
    })
  },

  goToDetail: function(e) {
    // 如果正在滑动，不触发跳转
    if (this._isSliding) {
      this._isSliding = false
      return
    }
    
    const activity = e.currentTarget.dataset.activity
    const index = this.data.activities.findIndex(a => a._id === activity._id)
    
    // 关闭其他卡片的滑动
    this.closeOtherSlides(index)
    
    // 如果当前卡片已滑开，先关闭滑动
    if (index >= 0 && this.data.activities[index].slideX && this.data.activities[index].slideX < 0) {
      const activities = this.data.activities
      activities[index].slideX = 0
      this.setData({ activities: activities })
      return
    }
    
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
    this.setData({ showAddModal: true, isEditing: false, editingId: '' })
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
      isEditing: false,
      editingId: '',
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
    const { newActivity, isEditing, editingId } = this.data
    
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

    if (isEditing && editingId) {
      // 编辑模式：更新现有活动
      db.collection('activities').doc(editingId).update({
        data: {
          title: activityData.title,
          date: activityData.date,
          timeValue: activityData.timeValue,
          time: activityData.time,
          location: activityData.location,
          latitude: activityData.latitude,
          longitude: activityData.longitude,
          activityType: activityData.activityType,
          fee: activityData.fee,
          description: activityData.description,
          maxPlayers: activityData.maxPlayers
        },
        success: function() {
          wx.showToast({ title: '更新成功', icon: 'success' })
          that.closeAddModal()
          that.loadActivities()
        },
        fail: function() {
          wx.showToast({ title: '更新失败', icon: 'none' })
        }
      })
    } else {
      // 新增模式
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
  },

  // 左滑删除相关
  touchStartX: 0,
  touchStartY: 0,

  onTouchStart: function(e) {
    if (!this.data.isAdmin) {
      this._isAdminSlide = false
      return
    }
    this._isAdminSlide = true
    this.touchStartX = e.touches[0].clientX
    this.touchStartY = e.touches[0].clientY
    this._lastMoveTime = 0
    this._isSliding = false
    const index = e.currentTarget.dataset.index
    this.touchStartSlideX = this.data.activities[index]?.slideX || 0
    this.closeOtherSlides(index)
  },

  onTouchMove: function(e) {
    if (!this._isAdminSlide) return

    const now = Date.now()
    if (this._lastMoveTime && now - this._lastMoveTime < 32) {
      return
    }
    this._lastMoveTime = now

    const index = e.currentTarget.dataset.index
    const moveX = e.touches[0].clientX
    const moveY = e.touches[0].clientY
    const deltaX = moveX - this.touchStartX
    const deltaY = moveY - this.touchStartY

    if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5) return

    if (Math.abs(deltaX) > 5) {
      this._isSliding = true
    }

    const startSlideX = this.touchStartSlideX || 0
    const pxToRpx = 750 / wx.getSystemInfoSync().windowWidth
    let newSlideX = startSlideX + deltaX * pxToRpx

    // 限制滑动范围：最小-280（露出两个按钮），最大0（收回）
    newSlideX = Math.max(Math.min(newSlideX, 0), -280)

    this.setData({
      [`activities[${index}].slideX`]: newSlideX
    })
  },

  onTouchEnd: function(e) {
    const index = e.currentTarget.dataset.index
    const activities = this.data.activities
    if (!activities || !activities[index]) return

    const item = activities[index]
    const slideX = item.slideX || 0

    if (slideX < -60) {
      this.setData({
        [`activities[${index}].slideX`]: -280
      })
    } else {
      this.setData({
        [`activities[${index}].slideX`]: 0
      })
    }
  },

  closeOtherSlides: function(currentIndex) {
    const activities = this.data.activities
    if (!activities) return
    const updates = {}
    let hasUpdate = false
    activities.forEach((item, idx) => {
      if (idx !== currentIndex && item.slideX && item.slideX < 0) {
        updates[`activities[${idx}].slideX`] = 0
        hasUpdate = true
      }
    })
    if (hasUpdate) {
      this.setData(updates)
    }
  },

  closeAllSlides: function() {
    const activities = this.data.activities
    if (!activities) return
    const updates = {}
    let hasUpdate = false
    activities.forEach((item, idx) => {
      if (item.slideX && item.slideX < 0) {
        updates[`activities[${idx}].slideX`] = 0
        hasUpdate = true
      }
    })
    if (hasUpdate) {
      this.setData(updates)
    }
  },

  editActivity: function(e) {
    if (!this.data.isAdmin) {
      wx.showToast({ title: '只有管理员可以编辑活动', icon: 'none' })
      return
    }

    const id = e.currentTarget.dataset.id
    const activity = this.data.activities.find(a => a._id === id)
    if (!activity) {
      wx.showToast({ title: '活动数据异常，无法编辑', icon: 'none' })
      return
    }
    if (!activity._id) {
      wx.showToast({ title: '活动数据异常，无法编辑', icon: 'none' })
      return
    }

    // 解析 time 字段为 date 和 timeValue
    let date = activity.date || ''
    let timeValue = ''
    if (activity.time) {
      const timeMatch = activity.time.match(/(\d{2}):(\d{2})/)
      if (timeMatch) {
        timeValue = `${timeMatch[1]}:${timeMatch[2]}`
      }
    }

    this.setData({
      showAddModal: true,
      isEditing: true,
      editingId: activity._id,
      newActivity: {
        title: activity.title || '',
        date: date,
        timeValue: timeValue,
        time: activity.time || '',
        location: activity.location || '',
        activityType: activity.activityType || '',
        fee: activity.fee || '',
        description: activity.description || '',
        maxPlayers: String(activity.maxPlayers || '')
      }
    })
    this.loadHistoryFromDb()
  },

  deleteActivity: function(e) {
    if (!this.data.isAdmin) {
      wx.showToast({ title: '只有管理员可以删除活动', icon: 'none' })
      return
    }

    const id = e.currentTarget.dataset.id
    const index = e.currentTarget.dataset.index
    if (!id) return

    const that = this
    wx.showModal({
      title: '确认删除',
      content: '删除后该活动的报名记录也将被删除，是否继续？',
      confirmColor: '#dc2626',
      success: function(res) {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
          
          // 先删除报名记录
          db.collection('signups').where({
            activityId: id
          }).get({
            success: function(signupRes) {
              const signups = signupRes.data || []
              let deletedCount = 0
              
              if (signups.length === 0) {
                // 没有报名记录，直接删除活动
                that._removeActivity(id, index)
                return
              }
              
              signups.forEach(s => {
                db.collection('signups').doc(s._id).remove({
                  success: function() {
                    deletedCount++
                    if (deletedCount === signups.length) {
                      that._removeActivity(id, index)
                    }
                  },
                  fail: function() {
                    deletedCount++
                    if (deletedCount === signups.length) {
                      that._removeActivity(id, index)
                    }
                  }
                })
              })
            },
            fail: function() {
              // 查询失败也尝试删除活动
              that._removeActivity(id, index)
            }
          })
        }
      }
    })
  },

  _removeActivity: function(id, index) {
    const that = this
    db.collection('activities').doc(id).remove({
      success: function() {
        wx.hideLoading()
        wx.showToast({ title: '删除成功', icon: 'success' })
        
        // 从列表中移除
        const activities = that.data.activities
        activities.splice(index, 1)
        that.setData({
          activities: activities
        })
      },
      fail: function() {
        wx.hideLoading()
        wx.showToast({ title: '删除失败', icon: 'none' })
      }
    })
  }
})