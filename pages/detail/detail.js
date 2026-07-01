const db = wx.cloud.database()

Page({
  data: {
    activity: {},
    signups: [],
    pendingList: [],
    leaveList: [],
    currentTab: 'signups',
    currentList: [],
    currentStatus: '',
    showFullList: true,
    showMenu: false,
    showSuccessModal: false,
    successTitle: '',
    users: [],
    hasUserInfo: false,
    userInfo: null,
    hasSignedUp: false,
    loading: false,
    lastLoadTime: 0,
    isOrganizer: false,
    // 评论相关
    comments: [],
    commentInput: '',
    replyTo: null,
    replyToNickName: '',
    showCommentInput: false,
    commentLoading: false,
    commentSubmitting: false,
    commentFocus: false
  },

  onLoad: function(options) {
    // console.log('detail page onLoad:', options)
    
    // 初始化活动数据，优先使用URL参数传递的数据
    const activityData = {
      id: options && options.id ? options.id : '',
      _id: options && options._id ? decodeURIComponent(options._id) : '',
      title: options && options.title ? decodeURIComponent(options.title) : '活动主题',
      date: options && options.date ? decodeURIComponent(options.date) : '',
      time: options && options.time ? decodeURIComponent(options.time) : '',
      location: options && options.location ? decodeURIComponent(options.location) : '',
      maxPlayers: options && options.maxPlayers ? parseInt(options.maxPlayers) : 21,
      status: '报名中'
    }
    
    // 处理状态参数，统一转换为中文显示
    if (options && options.status) {
      const status = decodeURIComponent(options.status)
      if (status === 'ended' || status === 'expired') {
        activityData.status = '已结束'
      } else if (status === 'active') {
        activityData.status = '报名中'
      } else if (status === 'cancelled') {
        activityData.status = '已取消'
      } else {
        activityData.status = status
      }
    }
    
    this.setData({ activity: activityData })
    
    // 如果有活动ID，尝试从数据库加载更多信息
    if (options && options.id) {
      this.loadActivity(options.id, () => {
        this.loadSignups()
      })
    } else {
      this.loadSignups()
    }
    
    this.loadUserInfo()
  },

  loadActivity: function(activityId, callback) {
    // console.log('loadActivity:', activityId)
    const that = this
    
    // 获取当前已设置的活动数据（从URL参数传入）
    const currentActivity = that.data.activity
    const currentStatus = currentActivity.status
    
    // 立即调用回调，让loadSignups可以执行
    if (typeof callback === 'function') {
      callback()
    }
    
    // 异步尝试查询数据库（补充数据，不覆盖已有数据）
    db.collection('activities').doc(activityId).get({
      timeout: 5000,
      success: function(res) {
        // console.log('loadActivity: 数据库查询成功')
        const dbData = res.data
        
        // 合并数据：优先使用数据库的数据（更完整），URL数据作为补充
        const activityData = {
          ...dbData,
          title: dbData.title || currentActivity.title || '活动主题',
          date: dbData.date || currentActivity.date || '',
          time: dbData.time || currentActivity.time || '',
          location: dbData.location || currentActivity.location || '',
          latitude: dbData.latitude || currentActivity.latitude || '',
          longitude: dbData.longitude || currentActivity.longitude || '',
          maxPlayers: dbData.maxPlayers || currentActivity.maxPlayers || 21,
          status: currentStatus || that.getActivityStatus(dbData)
        }
        
        that.setData({
          activity: activityData
        })
        
        // 判断当前用户是否是活动组织者
        that.checkIsOrganizer(activityData)
      },
      fail: function(err) {
        // console.log('loadActivity: 数据库查询失败，继续使用URL参数数据:', err)
      }
    })
  },
  
  // 判断当前用户是否是活动组织者
  checkIsOrganizer: function(activityData) {
    const that = this
    const { userInfo } = that.data
    
    if (!userInfo || !userInfo.nickName) {
      that.setData({ isOrganizer: false })
      return
    }
    
    const organizer = activityData.organizer || ''
    that.setData({ 
      isOrganizer: organizer === userInfo.nickName 
    })
  },
  
  // 根据活动日期判断活动状态
  getActivityStatus: function(activityData) {
    if (!activityData) return '报名中'
    
    // 如果已有明确状态，直接返回
    if (activityData.status && activityData.status !== 'active') {
      return activityData.status === 'ended' ? '已结束' : activityData.status
    }
    
    // 根据日期判断活动是否已结束
    const activityDate = activityData.date
    if (activityDate) {
      const now = new Date()
      const activityDateTime = new Date(activityDate)
      
      // 如果活动日期是过去的日期，标记为已结束
      if (activityDateTime < now) {
        return '已结束'
      }
    }
    
    return '报名中'
  },

  onShow: function() {
    // console.log('detail page onShow')
    const now = Date.now()
    // 如果用户刚操作过（5秒内），不重新加载数据，避免覆盖用户操作
    if (now - this.data.lastLoadTime > 30000) {
      this.loadSignups()
    }
  },

  loadUserInfo: function() {
    const that = this
    // 获取用户信息
    wx.getStorage({
      key: 'userInfo',
      success: function(res) {
        // console.log('detail: 从本地存储获取用户信息:', res.data)
        if (res.data && res.data.nickName) {
          that.setData({
            userInfo: res.data,
            hasUserInfo: true,
            loading: false
          })
          // 检查是否已报名
          that.checkSignedUp(res.data.nickName)
        } else {
          // console.log('detail: 用户信息不完整')
          that.setData({
            userInfo: null,
            hasUserInfo: false,
            loading: false
          })
        }
      },
      fail: function(err) {
        // console.log('detail: 本地存储无用户信息:', err)
        that.setData({
          userInfo: null,
          hasUserInfo: false,
          loading: false
        })
      }
    })
  },

  loadSignups: function() {
    // console.log('=== loadSignups ===')
    const that = this
    
    that.setData({ loading: true })
    
    // 收集所有可能的活动ID（报名记录可能使用 id 或 _id 保存）
    const possibleIds = []
    if (that.data.activity._id) possibleIds.push(that.data.activity._id)
    if (that.data.activity.id && that.data.activity.id !== that.data.activity._id) possibleIds.push(that.data.activity.id)
    
    // console.log('loadSignups: 活动对象:', that.data.activity, '可能的ID:', possibleIds)
    
    // 如果没有有效的活动ID，直接显示空列表
    if (possibleIds.length === 0) {
      that.setData({
        signups: [],
        pendingList: [],
        leaveList: [],
        currentList: [],
        loading: false
      })
      return
    }
    
    // 查询报名记录（匹配所有可能的活动ID）
    const query = possibleIds.length === 1 
      ? { activityId: possibleIds[0] }
      : { activityId: db.command.in(possibleIds) }
    
    db.collection('signups').where(query).get({
      timeout: 10000,
      success: function(res) {
        let signups = []
        let pendingList = []
        let leaveList = []
        
        if (res.data && res.data.length > 0) {
          const userMap = new Map()
          
          res.data.forEach((item) => {
            const key = item.userId || item.nickName || item._id
            const user = {
              nickName: item.nickName || '未知用户',
              matchCount: item.matchCount || 0,
              status: item.status || 'signups',
              avatarUrl: item.avatarUrl || '',
              userId: item.userId || item._id || ''
            }
            userMap.set(key, user)
          })
          
          userMap.forEach((user) => {
            if (user.status === 'pending') {
              pendingList.push(user)
            } else if (user.status === 'leave') {
              leaveList.push(user)
            } else {
              signups.push(user)
            }
          })
          
          // console.log('loadSignups: 分类后，报名:', signups.length, '人，待定:', pendingList.length, '人，请假:', leaveList.length, '人')
        }
        
        // 查询每个报名用户的总参与次数
        that.loadUserMatchCounts(signups, pendingList, leaveList, function(updatedSignups, updatedPending, updatedLeave) {
          that.setData({
            signups: updatedSignups,
            pendingList: updatedPending,
            leaveList: updatedLeave,
            currentList: that.data.currentTab === 'signups' ? updatedSignups : [...updatedPending, ...updatedLeave],
            loading: false,
            lastLoadTime: Date.now()
          })
          // 加载评论
          that.loadComments()
        })
        
        if (that.data.userInfo) {
          that.checkSignedUp(that.data.userInfo.nickName)
        }
      },
      fail: function(err) {
        // console.log('loadSignups: 数据库查询失败:', err)
        wx.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        })
        that.setData({ loading: false })
      }
    })
  },

  // 查询用户的总参与次数
  loadUserMatchCounts: function(signups, pendingList, leaveList, callback) {
    const that = this
    
    // 获取所有用户的昵称列表
    const allUsers = [...signups, ...pendingList, ...leaveList]
    const nickNames = allUsers.map(u => u.nickName).filter(n => n)
    
    if (nickNames.length === 0) {
      callback(signups, pendingList, leaveList)
      return
    }
    
    // 查询每个用户的报名记录数量（status为signups的记录）
    db.collection('signups').where({
      nickName: db.command.in(nickNames),
      status: 'signups'
    }).limit(500).get({
      timeout: 10000,
      success: function(res) {
        const signupRecords = res.data || []
        
        // 统计每个用户的报名次数
        const countMap = new Map()
        signupRecords.forEach(record => {
          const name = record.nickName
          if (name) {
            countMap.set(name, (countMap.get(name) || 0) + 1)
          }
        })
        
        // 更新用户的 matchCount
        const updateMatchCount = function(list) {
          return list.map(user => ({
            ...user,
            matchCount: countMap.get(user.nickName) || 0
          }))
        }
        
        callback(updateMatchCount(signups), updateMatchCount(pendingList), updateMatchCount(leaveList))
      },
      fail: function() {
        // 查询失败，保持原数据
        callback(signups, pendingList, leaveList)
      }
    })
  },

  checkSignedUp: function(nickName) {
    const { signups, pendingList, leaveList } = this.data
    const hasSignedUp = signups.some(s => s.nickName === nickName)
    
    // 检查当前状态
    let currentStatus = ''
    if (signups.some(s => s.nickName === nickName)) {
      currentStatus = 'signups'
    } else if (pendingList.some(s => s.nickName === nickName)) {
      currentStatus = 'pending'
    } else if (leaveList.some(s => s.nickName === nickName)) {
      currentStatus = 'leave'
    }
    
    this.setData({ 
      hasSignedUp: hasSignedUp,
      currentStatus: currentStatus
    })
  },

  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab
    let currentList = []
    
    if (tab === 'signups') {
      currentList = [...this.data.signups]
    } else if (tab === 'pendingLeave') {
      currentList = [...this.data.pendingList, ...this.data.leaveList]
    }
    
    this.setData({
      currentList: currentList,
      currentTab: tab
    })
  },

  toggleSignupsList: function() {
    this.setData({
      showFullList: !this.data.showFullList
    })
  },

  togglePendingLeaveList: function() {
    // console.log('togglePendingLeaveList')
  },

  showActionMenu: function() {
    this.setData({
      showMenu: true
    })
  },

  hideActionMenu: function() {
    this.setData({
      showMenu: false
    })
  },

  showSuccessModal: function(title) {
    this.setData({
      showSuccessModal: true,
      successTitle: title
    })
  },

  hideSuccessModal: function() {
    this.setData({
      showSuccessModal: false
    })
  },

  goToGroupChat: function() {
    const that = this
    this.hideSuccessModal()
    
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
    
    wx.showToast({ 
      title: '请点击右上角分享', 
      icon: 'none',
      duration: 2000 
    })
  },

  stopPropagation: function(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation()
    }
  },

  handleAction: function(e) {
    const action = e.currentTarget.dataset.action
    this.hideActionMenu()
    
    if (action === 'pending') {
      this.handlePending()
    } else if (action === 'leave') {
      this.handleLeave()
    } else if (action === 'cancel') {
      this.handleCancel()
    }
  },

  handleCancel: function() {
    const that = this
    const { hasUserInfo, currentStatus, userInfo } = this.data

    if (!hasUserInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    if (!currentStatus || currentStatus === 'signups') {
      wx.showToast({ title: '无需取消', icon: 'none' })
      return
    }

    const nickName = userInfo.nickName
    const avatarUrl = userInfo.avatarUrl || ''
    
    const updatedSignups = that.data.signups.filter(u => u.nickName !== nickName)
    const updatedPending = that.data.pendingList.filter(u => u.nickName !== nickName)
    const updatedLeave = that.data.leaveList.filter(u => u.nickName !== nickName)
    
    wx.cloud.callFunction({
      name: 'getOpenId',
      success: function(openRes) {
        const userId = openRes.result.openid
        
        const newUser = { 
          activityId: that.data.activity.id || that.data.activity._id,
          nickName: nickName, 
          matchCount: 0,
          status: 'signups',
          avatarUrl: avatarUrl,
          signupTime: new Date(),
          userId: userId
        }
        
        updatedSignups.push(newUser)
        
        that.setData({
          signups: updatedSignups,
          pendingList: updatedPending,
          leaveList: updatedLeave,
          currentStatus: 'signups',
          hasSignedUp: true
        })
        
        that.deleteOldRecord(function() {
          db.collection('signups').add({
            data: newUser,
            success: function(res) {
              wx.showToast({ title: '已取消，恢复报名', icon: 'success' })
            },
            fail: function(err) {
              wx.showToast({ title: '操作失败', icon: 'none' })
            }
          })
        })
      },
      fail: function() {
        const newUser = { 
          activityId: that.data.activity.id || that.data.activity._id,
          nickName: nickName, 
          matchCount: 0,
          status: 'signups',
          avatarUrl: avatarUrl,
          signupTime: new Date()
        }
        
        updatedSignups.push(newUser)
        
        that.setData({
          signups: updatedSignups,
          pendingList: updatedPending,
          leaveList: updatedLeave,
          currentStatus: 'signups',
          hasSignedUp: true
        })
        
        that.deleteOldRecord(function() {
          db.collection('signups').add({
            data: newUser,
            success: function(res) {
              wx.showToast({ title: '已取消，恢复报名', icon: 'success' })
            },
            fail: function(err) {
              wx.showToast({ title: '操作失败', icon: 'none' })
            }
          })
        })
      }
    })
  },

  getUserProfile: function(e) {
    const that = this
    // console.log('detail: getUserProfile')
    wx.getUserProfile({
      desc: '用于报名活动',
      success: function(res) {
        // console.log('detail: getUserProfile success:', res)
        that.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
        that.checkSignedUp(res.userInfo.nickName)
      },
      fail: function(err) {
        // console.log('detail: getUserProfile fail:', err)
        wx.showToast({ title: '授权失败', icon: 'none' })
      }
    })
  },

  handleSignup: function() {
    const that = this
    const { hasUserInfo, signups, pendingList, leaveList } = this.data

    if (!hasUserInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    const nickName = that.data.userInfo ? that.data.userInfo.nickName : '微信用户'
    
    // 检查用户是否已经在报名列表中
    const isInSignups = signups.some(u => u.nickName === nickName)
    
    if (isInSignups) {
      wx.showToast({ title: '您已报名', icon: 'none' })
      return
    }
    
    // 先从所有列表中移除当前用户
    const updatedSignups = signups.filter(u => u.nickName !== nickName)
    const updatedPending = that.data.pendingList.filter(u => u.nickName !== nickName)
    const updatedLeave = that.data.leaveList.filter(u => u.nickName !== nickName)
    
    // 获取用户openId作为userId
    wx.cloud.callFunction({
      name: 'getOpenId',
      success: function(openRes) {
        const userId = openRes.result.openid
        
        // 报名 - 保存到数据库
        // 使用 activity.id 或 activity._id 作为活动ID，确保正确关联
        const activityId = that.data.activity.id || that.data.activity._id
        
        const newUser = { 
          activityId: activityId,
          nickName: nickName, 
          matchCount: 0,
          status: 'signups',
          avatarUrl: that.data.userInfo ? that.data.userInfo.avatarUrl : '',
          signupTime: new Date(),
          userId: userId
        }
        
        // 添加到报名列表
        updatedSignups.push(newUser)
        
        // 先更新界面，保证用户体验
        that.setData({
          signups: updatedSignups,
          pendingList: updatedPending,
          leaveList: updatedLeave,
          currentList: updatedSignups,
          currentStatus: 'signups',
          hasSignedUp: true
        })
        
        // 再尝试保存到数据库
        that.deleteOldRecord(function() {
          db.collection('signups').add({
            data: newUser,
            success: function(res) {
              // console.log('报名成功，保存到数据库:', res)
              that.showSuccessModal('报名成功')
            },
            fail: function(err) {
              // console.error('报名保存失败:', err)
              // 数据库保存失败不影响界面状态，只给用户提示
              that.showSuccessModal('报名成功')
            }
          })
        })
      },
      fail: function() {
        // 获取openId失败，仍然保存但不包含userId
        // 使用 activity.id 或 activity._id 作为活动ID，确保正确关联
        const activityId = that.data.activity.id || that.data.activity._id
        
        const newUser = { 
          activityId: activityId,
          nickName: nickName, 
          matchCount: 0,
          status: 'signups',
          avatarUrl: that.data.userInfo ? that.data.userInfo.avatarUrl : '',
          signupTime: new Date()
        }
        
        updatedSignups.push(newUser)
        
        // 先更新界面，保证用户体验
        that.setData({
          signups: updatedSignups,
          pendingList: updatedPending,
          leaveList: updatedLeave,
          currentList: updatedSignups,
          currentStatus: 'signups',
          hasSignedUp: true
        })
        
        // 再尝试保存到数据库
        that.deleteOldRecord(function() {
          db.collection('signups').add({
            data: newUser,
            success: function(res) {
              // console.log('报名成功，保存到数据库:', res)
              that.showSuccessModal('报名成功')
            },
            fail: function(err) {
              // console.error('报名保存失败:', err)
              // 数据库保存失败不影响界面状态，只给用户提示
              that.showSuccessModal('报名成功')
            }
          })
        })
      }
    })
  },

  handlePending: function() {
    const that = this
    const { hasUserInfo, currentStatus, userInfo } = this.data

    // console.log('=== handlePending ===')
    // console.log('hasUserInfo:', hasUserInfo)
    // console.log('currentStatus:', currentStatus)
    // console.log('userInfo:', userInfo)

    if (!hasUserInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    if (!userInfo || !userInfo.nickName) {
      wx.showToast({ title: '请先获取用户信息', icon: 'none' })
      return
    }

    if (currentStatus === 'pending') {
      wx.showToast({ title: '您已在待定名单', icon: 'none' })
      return
    }

    const nickName = userInfo.nickName
    const avatarUrl = userInfo.avatarUrl || ''
    
    // console.log('nickName:', nickName)
    // console.log('avatarUrl:', avatarUrl)
    
    // 先从所有列表中移除当前用户
    const updatedSignups = that.data.signups.filter(u => u.nickName !== nickName)
    const updatedPending = that.data.pendingList.filter(u => u.nickName !== nickName)
    const updatedLeave = that.data.leaveList.filter(u => u.nickName !== nickName)
    
    // console.log('移除前 signups 长度:', that.data.signups.length)
    // console.log('移除后 signups 长度:', updatedSignups.length)
    
    // 获取用户openId作为userId
    wx.cloud.callFunction({
      name: 'getOpenId',
      success: function(openRes) {
        const userId = openRes.result.openid
        
        // 加入待定 - 保存到数据库
        const newUser = { 
          activityId: that.data.activity.id || that.data.activity._id,
          nickName: nickName, 
          matchCount: 0,
          status: 'pending',
          avatarUrl: avatarUrl,
          signupTime: new Date(),
          userId: userId
        }
        
        // 添加到待定列表
        updatedPending.push(newUser)
        
        // 更新界面
        that.setData({
          signups: updatedSignups,
          pendingList: updatedPending,
          leaveList: updatedLeave,
          currentStatus: 'pending',
          hasSignedUp: false,
          currentList: that.data.currentTab === 'signups' ? updatedSignups : [...updatedPending, ...updatedLeave]
        })
        
        // 先删除旧记录，再添加新记录
        that.deleteOldRecord(function() {
          db.collection('signups').add({
            data: newUser,
            success: function(res) {
              // console.log('待定成功，保存到数据库:', res)
              wx.showToast({ title: '已加入待定', icon: 'success' })
            },
            fail: function(err) {
              // console.error('待定保存失败:', err)
              wx.showToast({ title: '操作失败', icon: 'none' })
            }
          })
        })
      },
      fail: function() {
        // 获取openId失败，仍然保存但不包含userId
        const newUser = { 
          activityId: that.data.activity.id || that.data.activity._id,
          nickName: nickName, 
          matchCount: 0,
          status: 'pending',
          avatarUrl: avatarUrl,
          signupTime: new Date()
        }
        
        updatedPending.push(newUser)
        
        that.setData({
          signups: updatedSignups,
          pendingList: updatedPending,
          leaveList: updatedLeave,
          currentStatus: 'pending',
          hasSignedUp: false,
          currentList: that.data.currentTab === 'signups' ? updatedSignups : [...updatedPending, ...updatedLeave]
        })
        
        that.deleteOldRecord(function() {
          db.collection('signups').add({
            data: newUser,
            success: function(res) {
              that.showSuccessModal('待定成功')
            },
            fail: function(err) {
              wx.showToast({ title: '操作失败', icon: 'none' })
            }
          })
        })
      }
    })
  },

  handleLeave: function() {
    const that = this
    const { hasUserInfo, currentStatus } = this.data

    if (!hasUserInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    if (currentStatus === 'leave') {
      wx.showToast({ title: '您已请假', icon: 'none' })
      return
    }

    const nickName = that.data.userInfo ? that.data.userInfo.nickName : '微信用户'
    const avatarUrl = that.data.userInfo ? that.data.userInfo.avatarUrl : ''
    
    // 先从所有列表中移除当前用户
    const updatedSignups = that.data.signups.filter(u => u.nickName !== nickName)
    const updatedPending = that.data.pendingList.filter(u => u.nickName !== nickName)
    const updatedLeave = that.data.leaveList.filter(u => u.nickName !== nickName)
    
    // 获取用户openId作为userId
    wx.cloud.callFunction({
      name: 'getOpenId',
      success: function(openRes) {
        const userId = openRes.result.openid
        
        // 加入请假 - 保存到数据库
        const newUser = { 
          activityId: that.data.activity.id || that.data.activity._id,
          nickName: nickName, 
          matchCount: 0,
          status: 'leave',
          avatarUrl: avatarUrl,
          signupTime: new Date(),
          userId: userId
        }
        
        // 添加到请假列表
        updatedLeave.push(newUser)
        
        // 更新界面
        that.setData({
          signups: updatedSignups,
          pendingList: updatedPending,
          leaveList: updatedLeave,
          currentStatus: 'leave',
          hasSignedUp: false,
          currentList: that.data.currentTab === 'signups' ? updatedSignups : [...updatedPending, ...updatedLeave]
        })
        
        // 先删除旧记录，再添加新记录
        that.deleteOldRecord(function() {
          db.collection('signups').add({
            data: newUser,
            success: function(res) {
              // console.log('请假成功，保存到数据库:', res)
              that.showSuccessModal('请假成功')
            },
            fail: function(err) {
              // console.error('请假保存失败:', err)
              wx.showToast({ title: '操作失败', icon: 'none' })
            }
          })
        })
      },
      fail: function() {
        // 获取openId失败，仍然保存但不包含userId
        const newUser = { 
          activityId: that.data.activity.id || that.data.activity._id,
          nickName: nickName, 
          matchCount: 0,
          status: 'leave',
          avatarUrl: avatarUrl,
          signupTime: new Date()
        }
        
        updatedLeave.push(newUser)
        
        that.setData({
          signups: updatedSignups,
          pendingList: updatedPending,
          leaveList: updatedLeave,
          currentStatus: 'leave',
          hasSignedUp: false,
          currentList: that.data.currentTab === 'signups' ? updatedSignups : [...updatedPending, ...updatedLeave]
        })
        
        that.deleteOldRecord(function() {
          db.collection('signups').add({
            data: newUser,
            success: function(res) {
              wx.showToast({ title: '已请假', icon: 'success' })
            },
            fail: function(err) {
              wx.showToast({ title: '操作失败', icon: 'none' })
            }
          })
        })
      }
    })
  },
  
  // 删除旧记录（只删除当前活动的旧记录）
  deleteOldRecord: function(callback) {
    const that = this
    const nickName = that.data.userInfo ? that.data.userInfo.nickName : '微信用户'
    // 使用 activity.id 或 activity._id 作为活动ID，确保正确关联
    const activityId = that.data.activity.id || that.data.activity._id
    
    // console.log('deleteOldRecord: 删除旧记录，活动ID:', activityId, '用户:', nickName)
    
    // 收集所有可能的活动ID（报名记录可能使用 id 或 _id 保存）
    const possibleIds = []
    if (that.data.activity._id) possibleIds.push(that.data.activity._id)
    if (that.data.activity.id && that.data.activity.id !== that.data.activity._id) possibleIds.push(that.data.activity.id)
    
    // 只删除当前活动的旧记录，不影响其他活动
    const query = possibleIds.length === 1 
      ? { activityId: possibleIds[0], nickName: nickName }
      : { activityId: db.command.in(possibleIds), nickName: nickName }
    
    db.collection('signups').where(query).remove({
      success: function(res) {
        // 调用回调函数
        if (typeof callback === 'function') {
          callback()
        }
      },
      fail: function(err) {
        // 即使删除失败，也继续执行回调（保证新记录能保存）
        if (typeof callback === 'function') {
          callback()
        }
      }
    })
  },

  // 跳转到用户主页
  goToUserProfile: function(e) {
    const user = e.currentTarget.dataset.user
    if (!user || !user.userId) {
      wx.showToast({
        title: '用户信息不完整',
        icon: 'none'
      })
      return
    }
    
    const nickName = encodeURIComponent(user.nickName || '')
    const avatarUrl = user.avatarUrl ? encodeURIComponent(user.avatarUrl) : ''
    
    let url = `/pages/userProfile/userProfile?userId=${user.userId}&nickName=${nickName}`
    
    if (avatarUrl) {
      url += `&avatarUrl=${avatarUrl}`
    }
    
    wx.navigateTo({
      url: url
    })
  },

  // 场地导航
  handleNavigate: function() {
    const that = this
    const location = this.data.activity.location
    if (!location) {
      wx.showToast({ title: '暂无地址信息', icon: 'none' })
      return
    }
    
    wx.setClipboardData({
      data: location,
      success: function() {
        wx.showModal({
          title: '导航提示',
          content: `地址已复制：${location}\n\n是否打开地图应用导航？`,
          confirmText: '打开地图',
          confirmColor: '#dc2626',
          success: function(res) {
            if (res.confirm) {
              const activity = that.data.activity
              // 优先使用活动中保存的经纬度
              let lat = activity.latitude || 24.4798
              let lng = activity.longitude || 118.0894
              
              // 如果没有保存经纬度，使用默认值
              if (!lat || !lng) {
                lat = 24.4798
                lng = 118.0894
              }
              
              wx.openLocation({
                name: location,
                address: location,
                latitude: lat,
                longitude: lng,
                scale: 18,
                success: function() {
                  // console.log('打开地图成功')
                },
                fail: function(err) {
                  // console.error('打开地图失败:', err)
                  wx.showToast({ title: '请手动打开地图应用', icon: 'none' })
                }
              })
            }
          }
        })
      },
      fail: function() {
        wx.showModal({
          title: '导航提示',
          content: `活动地点：${location}\n\n请手动打开地图应用导航`,
          confirmText: '知道了',
          confirmColor: '#dc2626'
        })
      }
    })
  },
  
  // 修改活动地址（仅组织者）
  handleEditLocation: function(e) {
    e.stopPropagation()
    
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
        
        const activity = that.data.activity
        const activityId = activity.id || activity._id
        
        if (!activityId) {
          wx.showToast({ title: '活动ID无效', icon: 'none' })
          return
        }
        
        db.collection('activities').doc(activityId).update({
          data: {
            location: fullAddress,
            latitude: res.latitude,
            longitude: res.longitude
          },
          success: function() {
            that.setData({
              'activity.location': fullAddress,
              'activity.latitude': res.latitude,
              'activity.longitude': res.longitude
            })
            wx.showToast({ title: '地址修改成功', icon: 'success' })
          },
          fail: function(err) {
            // console.error('修改地址失败:', err)
            wx.showToast({ title: '修改地址失败', icon: 'none' })
          }
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
        }
      }
    })
  },

  // ========== 评论功能 ==========

  // 加载评论列表
  loadComments: function() {
    const that = this
    const activityId = this.data.activity._id || this.data.activity.id
    if (!activityId) return

    that.setData({ commentLoading: true })

    db.collection('comments').where({
      activityId: activityId
    }).orderBy('createTime', 'asc').limit(100).get({
      timeout: 8000,
      success: function(res) {
        const comments = (res.data || []).map(c => ({
          ...c,
          isOwner: false  // 稍后由 checkCommentOwnership 设置
        }))

        that.setData({ comments: comments, commentLoading: false })
        that.checkCommentOwnership(comments)
      },
      fail: function() {
        that.setData({ comments: [], commentLoading: false })
      }
    })
  },

  // 检查评论所有权
  checkCommentOwnership: function(comments) {
    const that = this
    wx.cloud.callFunction({
      name: 'getOpenId',
      success: function(res) {
        const myOpenId = res.result.openid
        const updated = comments.map(c => ({
          ...c,
          isOwner: c._openid === myOpenId
        }))
        that.setData({ comments: updated })
      },
      fail: function() {
        // 无法获取openid，都不标记为owner
      }
    })
  },

  // 输入评论内容
  onCommentInput: function(e) {
    this.setData({ commentInput: e.detail.value })
  },

  // 提交评论
  submitComment: function() {
    const that = this
    const content = (this.data.commentInput || '').trim()
    if (!content) {
      wx.showToast({ title: '请输入评论内容', icon: 'none' })
      return
    }
    if (content.length > 500) {
      wx.showToast({ title: '评论不能超过500字', icon: 'none' })
      return
    }

    const userInfo = this.data.userInfo
    if (!userInfo || !userInfo.nickName) {
      wx.showToast({ title: '请先获取用户信息', icon: 'none' })
      return
    }

    that.setData({ commentSubmitting: true })

    wx.cloud.callFunction({
      name: 'getOpenId',
      success: function(openRes) {
        const activityId = that.data.activity._id || that.data.activity.id
        const comment = {
          activityId: activityId,
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl || '',
          content: content,
          replyTo: that.data.replyTo || null,
          replyToNickName: that.data.replyToNickName || '',
          createTime: db.serverDate()
        }

        db.collection('comments').add({
          data: comment,
          success: function() {
            that.setData({
              commentInput: '',
              replyTo: null,
              replyToNickName: '',
              commentSubmitting: false
            })
            wx.showToast({ title: '评论成功', icon: 'success' })
            that.loadComments()
          },
          fail: function(err) {
            that.setData({ commentSubmitting: false })
            wx.showToast({ title: '评论失败，请重试', icon: 'none' })
          }
        })
      },
      fail: function() {
        that.setData({ commentSubmitting: false })
        wx.showToast({ title: '获取用户信息失败', icon: 'none' })
      }
    })
  },

  // 回复评论
  replyComment: function(e) {
    const comment = e.currentTarget.dataset.comment
    if (!comment) return

    this.setData({
      replyTo: comment._id,
      replyToNickName: comment.nickName || '未知用户',
      showCommentInput: true
    })

    // 延迟聚焦输入框（小程序限制）
    setTimeout(() => {
      this.setData({ commentFocus: true })
    }, 300)
  },

  // 取消回复
  cancelReply: function() {
    this.setData({
      replyTo: null,
      replyToNickName: '',
      commentInput: '',
      commentFocus: false
    })
  },

  // 删除评论
  deleteComment: function(e) {
    const that = this
    const comment = e.currentTarget.dataset.comment
    if (!comment || !comment._id) return

    wx.showModal({
      title: '删除评论',
      content: '确定要删除这条评论吗？',
      confirmColor: '#dc2626',
      success: function(res) {
        if (res.confirm) {
          db.collection('comments').doc(comment._id).remove({
            success: function() {
              wx.showToast({ title: '已删除', icon: 'success' })
              that.loadComments()
            },
            fail: function() {
              wx.showToast({ title: '删除失败', icon: 'none' })
            }
          })
        }
      }
    })
  },

  // 格式化评论时间
  formatCommentTime: function(createTime) {
    if (!createTime) return ''
    const date = new Date(createTime)
    const now = new Date()
    const diff = now - date
    const minute = 60 * 1000
    const hour = 60 * minute
    const day = 24 * hour

    if (diff < minute) return '刚刚'
    if (diff < hour) return Math.floor(diff / minute) + '分钟前'
    if (diff < day) return Math.floor(diff / hour) + '小时前'
    if (diff < 7 * day) return Math.floor(diff / day) + '天前'

    const month = date.getMonth() + 1
    const dayNum = date.getDate()
    return month + '月' + dayNum + '日'
  }
})