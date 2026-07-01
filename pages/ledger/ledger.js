const db = wx.cloud.database()

Page({
  data: {
    isAdmin: true,  // 默认超级管理员
    balance: '0.00',
    records: [],
    incomeRecords: [],
    expenseRecords: [],
    totalIncome: '0.00',
    totalExpense: '0.00',
    showIncomeModal: false,
    showExpenseModal: false,
    showEditModal: false,
    editId: '',
    formAmount: '',
    formTitle: '',
    loading: true,
    showError: false,
    errorMsg: '',
    // 放鸽子管理相关
    showDoveModal: false,
    activities: [],
    selectedActivity: '',
    activitySignups: [],
    selectedDoves: [],
    // 日期筛选（格式：YYYY-MM-DD）
    filterDate: '',
    // 显示的日期（格式：26年5月）
    displayDate: ''
  },

  // 格式化年月显示
  formatDate: function(dateStr) {
    if (!dateStr) return ''
    const [year, month] = dateStr.split('-')
    return `${year}年${parseInt(month)}月`
  },

  onLoad: function() {
    this.setData({ loading: true, showError: false })
    this.checkAdmin()
    this.loadRecordsWithTimeout()
  },

  onShow: function() {
    this.loadRecordsWithTimeout()
  },

  checkAdmin: function() {
    // 设置为普通用户
    // console.log('ledger: 设置为普通用户')
    this.setData({ isAdmin: true })
    
    // 原有逻辑（已注释）
    // const that = this
    // // console.log('检查管理员权限')
    // 
    // const timer = setTimeout(function() {
    //   // console.log('检查管理员超时，跳过')
    // }, 5000)
    // 
    // wx.cloud.callFunction({
    //   name: 'getOpenId',
    //   success: function(res) {
    //     clearTimeout(timer)
    //     if (res && res.result) {
    //       const openId = res.result.openid
    //       // console.log('获取到OpenId:', openId)
    //       that.checkAdminByOpenId(openId)
    //     }
    //   },
    //   fail: function(err) {
    //     clearTimeout(timer)
    //     // console.log('获取OpenId失败:', err)
    //     that.setData({ isAdmin: false })
    //   }
    // })
  },

  checkAdminByOpenId: function(openId) {
    const that = this
    const timer = setTimeout(() => {
      // console.log('checkAdminByOpenId: 查询超时')
    }, 8000)
    
    db.collection('admins').where({
      openId: openId
    }).limit(1).get({
      timeout: 8000,
      success: function(res) {
        clearTimeout(timer)
        if (res && res.data && res.data.length > 0) {
          that.setData({ isAdmin: true })
        }
      },
      fail: function() {
        clearTimeout(timer)
      }
    })
  },

  loadRecordsWithTimeout: function() {
    const that = this
    const timer = setTimeout(function() {
      // console.log('加载记录超时')
      that.setData({ 
        loading: false,
        showError: true,
        errorMsg: '网络超时，请检查网络连接'
      })
    }, 10000)

    db.collection('records').where({ activityId: '1' }).orderBy('createTime', 'desc').get({
      success: function(res) {
        clearTimeout(timer)
        if (res && res.data) {
          const records = res.data.map(item => {
            try {
              const time = new Date(item.createTime)
              const month = time.getMonth() + 1
              const day = time.getDate()
              const hour = time.getHours().toString().padStart(2, '0')
              const minute = time.getMinutes().toString().padStart(2, '0')
              return {
                ...item,
                time: `${month}月${day}日 ${hour}:${minute}`
              }
            } catch (e) {
              return { ...item, time: '未知时间' }
            }
          })
          
          let totalIncome = 0
          let totalExpense = 0
          records.forEach(record => {
            const amount = parseFloat(record.amount) || 0
            if (record.type === 'income') {
              totalIncome += amount
            } else {
              totalExpense += amount
            }
          })
          
          const balance = (totalIncome - totalExpense).toFixed(2)
          
          // 提取收入和支出记录用于统计报表
          const incomeRecords = records.filter(r => r.type === 'income')
          const expenseRecords = records.filter(r => r.type === 'expense')
          
          that.setData({ 
            records: records, 
            balance: balance,
            totalIncome: totalIncome.toFixed(2),
            totalExpense: totalExpense.toFixed(2),
            incomeRecords: incomeRecords,
            expenseRecords: expenseRecords,
            loading: false,
            showError: false
          })
        }
      },
      fail: function(err) {
        clearTimeout(timer)
        // console.log('加载记录失败:', err)
        that.setData({ 
          loading: false,
          showError: true,
          errorMsg: '加载失败: ' + (err.errMsg || '未知错误')
        })
      }
    })
  },

  showIncomeModal: function() {
    this.setData({ showIncomeModal: true, formAmount: '', formTitle: '' })
  },

  showExpenseModal: function() {
    this.setData({ showExpenseModal: true, formAmount: '', formTitle: '' })
  },

  closeModal: function() {
    this.setData({ 
      showIncomeModal: false, 
      showExpenseModal: false, 
      showEditModal: false,
      editId: ''
    })
  },

  editRecord: function(e) {
    if (!this.data.isAdmin) {
      wx.showToast({ title: '只有管理员可以编辑', icon: 'none' })
      return
    }
    
    const id = e.currentTarget.dataset.id
    const amount = e.currentTarget.dataset.amount
    const title = e.currentTarget.dataset.title
    
    this.setData({
      showEditModal: true,
      editId: id,
      formAmount: amount,
      formTitle: title
    })
  },

  updateRecord: function() {
    const { editId, formAmount, formTitle } = this.data
    
    if (!formAmount) {
      wx.showToast({ title: '请输入金额', icon: 'none' })
      return
    }
    
    if (!formTitle) {
      wx.showToast({ title: '请输入说明', icon: 'none' })
      return
    }

    const amount = parseFloat(formAmount)
    if (isNaN(amount) || amount <= 0) {
      wx.showToast({ title: '请输入正确的金额', icon: 'none' })
      return
    }

    wx.showLoading({ title: '更新中...' })

    const that = this
    let timeout = false
    const timer = setTimeout(function() {
      timeout = true
      wx.hideLoading()
      wx.showToast({ title: '更新超时，请重试', icon: 'none', duration: 3000 })
    }, 5000)

    db.collection('records').doc(editId).update({
      data: {
        amount: amount.toFixed(2),
        title: formTitle,
        updateTime: new Date()
      },
      success: function() {
        clearTimeout(timer)
        if (!timeout) {
          wx.hideLoading()
          wx.showToast({ title: '更新成功', icon: 'success' })
          that.closeModal()
          that.loadRecordsWithTimeout()
        }
      },
      fail: function(err) {
        clearTimeout(timer)
        if (!timeout) {
          wx.hideLoading()
          // console.log('更新记录失败:', err)
          wx.showToast({ title: '更新失败: ' + (err.errMsg || '未知错误'), icon: 'none', duration: 3000 })
        }
      }
    })
  },

  deleteRecord: function(e) {
    if (!this.data.isAdmin) {
      wx.showToast({ title: '只有管理员可以删除', icon: 'none' })
      return
    }
    
    const id = e.currentTarget.dataset.id
    
    const that = this
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: function(res) {
        if (res.confirm) {
          that.doDeleteRecord(id)
        }
      }
    })
  },

  doDeleteRecord: function(id) {
    wx.showLoading({ title: '删除中...' })

    const that = this
    let timeout = false
    const timer = setTimeout(function() {
      timeout = true
      wx.hideLoading()
      wx.showToast({ title: '删除超时，请重试', icon: 'none', duration: 3000 })
    }, 5000)

    db.collection('records').doc(id).remove({
      success: function() {
        clearTimeout(timer)
        if (!timeout) {
          wx.hideLoading()
          wx.showToast({ title: '删除成功', icon: 'success' })
          that.loadRecordsWithTimeout()
        }
      },
      fail: function(err) {
        clearTimeout(timer)
        if (!timeout) {
          wx.hideLoading()
          // console.log('删除记录失败:', err)
          wx.showToast({ title: '删除失败: ' + (err.errMsg || '未知错误'), icon: 'none', duration: 3000 })
        }
      }
    })
  },

  onAmountInput: function(e) {
    this.setData({ formAmount: e.detail.value })
  },

  onTitleInput: function(e) {
    this.setData({ formTitle: e.detail.value })
  },

  quickIncome: function(e) {
    const amount = e.currentTarget.dataset.amount
    const title = e.currentTarget.dataset.title
    this.setData({
      formAmount: amount,
      formTitle: title
    })
  },

  saveRecord: function() {
    const { showIncomeModal, showExpenseModal, formAmount, formTitle } = this.data
    
    if (!formAmount) {
      wx.showToast({ title: '请输入金额', icon: 'none' })
      return
    }
    
    if (!formTitle) {
      wx.showToast({ title: '请输入说明', icon: 'none' })
      return
    }

    const amount = parseFloat(formAmount)
    if (isNaN(amount) || amount <= 0) {
      wx.showToast({ title: '请输入正确的金额', icon: 'none' })
      return
    }

    const type = showIncomeModal ? 'income' : 'expense'

    wx.showLoading({ title: '保存中...' })

    const that = this
    let timeout = false
    const timer = setTimeout(function() {
      timeout = true
      wx.hideLoading()
      wx.showToast({ title: '保存超时，请重试', icon: 'none', duration: 3000 })
    }, 5000)

    db.collection('records').add({
      data: {
        activityId: '1',
        type: type,
        amount: amount.toFixed(2),
        title: formTitle,
        createTime: new Date()
      },
      success: function() {
        clearTimeout(timer)
        if (!timeout) {
          wx.hideLoading()
          wx.showToast({ title: '保存成功', icon: 'success' })
          that.closeModal()
          that.loadRecordsWithTimeout()
        }
      },
      fail: function(err) {
        clearTimeout(timer)
        if (!timeout) {
          wx.hideLoading()
          // console.log('保存记录失败:', err)
          if (err.errCode === -501000) {
            wx.showToast({ title: '请先创建 records 集合', icon: 'none', duration: 3000 })
          } else {
            wx.showToast({ title: '保存失败: ' + (err.errMsg || '未知错误'), icon: 'none', duration: 3000 })
          }
        }
      }
    })
  },

  // ========== 放鸽子管理功能 ==========
  
  // 显示放鸽子管理弹窗
  showDoveModal: function() {
    if (!this.data.isAdmin) {
      wx.showToast({ title: '只有管理员可以操作', icon: 'none' })
      return
    }
    
    const now = new Date()
    const defaultYear = now.getFullYear()
    const defaultMonth = String(now.getMonth() + 1).padStart(2, '0')
    const defaultDate = `${defaultYear}-${defaultMonth}-01`
    const displayDate = `${defaultYear.toString().slice(2)}年${parseInt(defaultMonth)}月`
    
    // console.log('打开鸽子管理弹窗，默认日期:', defaultDate, '显示:', displayDate)
    
    this.setData({ 
      showDoveModal: true, 
      selectedActivity: '', 
      activitySignups: [], 
      selectedDoves: [],
      filterDate: defaultDate,
      displayDate: displayDate
    })
    this.loadActivities()
  },
  
  // 日期选择器变化处理
  onDateChange: function(e) {
    const date = e.detail.value
    // console.log('Date changed:', date)
    
    // 格式化显示日期
    const year = date.slice(0, 4)
    const month = parseInt(date.slice(5, 7))
    const displayDate = `${year.slice(2)}年${month}月`
    
    this.setData({ 
      filterDate: date,
      displayDate: displayDate
    })
    this.loadActivities()
  },

  // 加载已结束的活动列表（支持年月筛选）
  loadActivities: function() {
    const that = this
    const { filterDate } = this.data
    
    // console.log('=== loadActivities 开始 ===')
    // console.log('filterDate:', filterDate)
    
    const timer = setTimeout(function() {
      // console.error('加载活动超时')
      that.setData({ activities: [] })
      wx.showToast({ title: '加载超时，请重试', icon: 'none' })
    }, 5000)
    
    // 直接查询所有活动，不设置状态条件，然后在客户端筛选
    db.collection('activities')
      .orderBy('createTime', 'desc')
      .limit(50)
      .get({
        success: function(res) {
          clearTimeout(timer)
          let activities = res.data || []
          
          // console.log('数据库查询成功，返回记录数:', activities.length)
          // 遍历活动列表，检查活动状态
          activities.forEach((activity, index) => {
            // 活动数据处理
          })
          
          // 先过滤出已结束的活动
          let endedActivities = activities.filter(activity => {
            const status = activity.status || 'unknown'
            const isEndedStatus = status === 'ended' || status === '已结束' || status === 'expired'
            
            // 如果状态是active，但日期已经过去，也视为已结束
            if (!isEndedStatus && status === 'active') {
              const activityDate = activity.date
              if (activityDate) {
                const activityDateTime = new Date(activityDate)
                const now = new Date()
                if (activityDateTime < now) {
                  return true
                }
              }
            }
            
            return isEndedStatus
          })
          
          // 已结束活动筛选完成
          
          // 如果有日期筛选条件，进行日期筛选
          // filterDate 格式为 YYYY-MM-DD
          if (filterDate && filterDate.length >= 7) {
            const year = filterDate.slice(0, 4)
            const month = filterDate.slice(5, 7)
            const startDateStr = `${year}-${month}-01`
            const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate()
            const endDateStr = `${year}-${month}-${daysInMonth}`
            
            // console.log('日期筛选范围:', startDateStr, '至', endDateStr)
            
            endedActivities = endedActivities.filter(activity => {
              const activityDate = activity.date
              const match = activityDate && activityDate >= startDateStr && activityDate <= endDateStr
              if (match) {
                // console.log('✓ 匹配活动:', activity.title, ', 日期:', activityDate)
              } else {
                // console.log('✗ 不匹配活动:', activity.title, ', 日期:', activityDate)
              }
              return match
            })
            
            // console.log('日期筛选后活动数:', endedActivities.length)
          }
          
          // console.log('=== 最终活动列表 ===')
          // console.log(JSON.stringify(endedActivities))
          that.setData({ activities: endedActivities })
          
          if (endedActivities.length === 0) {
            wx.showToast({ title: '该月份暂无已结束的活动', icon: 'none' })
          }
        },
        fail: function(err) {
          clearTimeout(timer)
          // console.error('加载活动列表失败:', err)
          that.setData({ activities: [] })
          wx.showToast({ title: '加载失败，请重试', icon: 'none' })
        }
      })
  },
  
  // 解析时间字符串为标准格式
  parseTime: function(timeStr) {
    // 移除星期几前缀
    const timePart = timeStr.replace(/^(周一|周二|周三|周四|周五|周六|周日)\s*/, '')
    return timePart || '00:00'
  },

  // 选择活动
  selectActivity: function(e) {
    const activityId = e.currentTarget.dataset.id
    
    const activity = this.data.activities.find(a => (a._id === activityId || a.id === activityId))
    
    if (!activity) {
      wx.showToast({ title: '活动不存在', icon: 'none' })
      return
    }
    
    this.setData({ 
      selectedActivity: activityId, 
      activitySignups: [], 
      selectedDoves: [] 
    })
    
    // 从数据库获取报名数据
    this.loadActivitySignups(activityId, activity)
  },

  // 加载活动报名用户列表（从数据库获取）
  loadActivitySignups: function(activityId, activity) {
    const that = this
    // 如果没有传入活动对象，从活动列表中查找
    if (!activity) {
      activity = this.data.activities.find(a => (a._id === activityId || a.id === activityId))
    }
    
    // 收集所有可能的活动ID（报名记录可能使用 id 或 _id 保存）
    const possibleIds = []
    if (activity) {
      if (activity._id) possibleIds.push(activity._id)
      if (activity.id && activity.id !== activity._id) possibleIds.push(activity.id)
    }
    if (possibleIds.indexOf(activityId) === -1) possibleIds.push(activityId)
    
    const timer = setTimeout(function() {
      that.setDefaultSignups(activityId)
    }, 10000)
    
    // 查询鸽子记录（需要匹配所有可能的活动ID）
    const doveQuery = possibleIds.length === 1 
      ? { activityId: possibleIds[0] }
      : { activityId: db.command.in(possibleIds) }
    
    db.collection('doves').where(doveQuery).get({
      success: function(doveRes) {
        const existingDoveUserIds = (doveRes.data || []).map(item => item.userId)
        
        // 查询报名记录（需要匹配所有可能的活动ID）
        const signupQuery = possibleIds.length === 1 
          ? { activityId: possibleIds[0] }
          : { activityId: db.command.in(possibleIds) }
        
        db.collection('signups').where(signupQuery).get({
          success: function(res) {
            clearTimeout(timer)
            let activitySignups = res && res.data ? res.data : []
            
            // 去重：同一个用户可能有重复的报名记录
            const userMap = new Map()
            activitySignups.forEach(item => {
              const key = item.userId || item.nickName || item._id
              if (!userMap.has(key)) {
                userMap.set(key, item)
              }
            })
            activitySignups = Array.from(userMap.values())
            
            activitySignups = activitySignups.map(item => ({ 
              ...item, 
              isDove: existingDoveUserIds.includes(item.userId)
            }))
            
            const alreadyDoves = activitySignups.filter(item => item.isDove).map(item => item.userId)
            
            that.setData({ 
              activitySignups: activitySignups,
              selectedDoves: alreadyDoves,
              totalSignups: activitySignups.length
            })
          },
          fail: function(err) {
            clearTimeout(timer)
            that.setDefaultSignups(activityId)
          }
        })
      },
      fail: function(err) {
        clearTimeout(timer)
        // 查询鸽子失败但继续查询报名记录
        that.loadSignupsWithoutDoves(activityId, possibleIds)
      }
    })
  },
  
  // 不查询鸽子记录，只查询报名记录（用于鸽子记录查询失败时）
  loadSignupsWithoutDoves: function(activityId, possibleIds) {
    const that = this
    
    const signupQuery = possibleIds.length === 1 
      ? { activityId: possibleIds[0] }
      : { activityId: db.command.in(possibleIds) }
    
    db.collection('signups').where(signupQuery).get({
      success: function(res) {
        let activitySignups = res && res.data ? res.data : []
        
        // 去重
        const userMap = new Map()
        activitySignups.forEach(item => {
          const key = item.userId || item.nickName || item._id
          if (!userMap.has(key)) {
            userMap.set(key, item)
          }
        })
        activitySignups = Array.from(userMap.values())
        
        that.setData({ 
          activitySignups: activitySignups,
          selectedDoves: [],
          totalSignups: activitySignups.length
        })
      },
      fail: function(err) {
        that.setDefaultSignups(activityId)
      }
    })
  },
  
  // 设置默认报名数据
  setDefaultSignups: function(activityId) {
    const activitySignups = this.getDefaultSignupsData(activityId)
    this.setData({ 
      activitySignups: activitySignups,
      selectedDoves: []
    })
  },
  
  // 获取默认报名数据（用于数据库无数据时的容错）
  getDefaultSignupsData: function(activityId) {
    // 返回空数组，不显示虚假数据
    return []
  },

  // 选择放鸽子用户
  toggleDove: function(e) {
    const userId = e.currentTarget.dataset.userid
    const nickName = e.currentTarget.dataset.nickname
    const isDove = e.currentTarget.dataset.isdove === 'true'
    
    let { selectedDoves, activitySignups } = this.data
    
    const index = selectedDoves.indexOf(userId)
    if (index > -1) {
      // 取消标记
      selectedDoves.splice(index, 1)
      wx.showToast({
        title: `${nickName} 已取消鸽子标记`,
        icon: 'none'
      })
    } else {
      // 添加标记
      selectedDoves.push(userId)
    }
    
    activitySignups = activitySignups.map(item => {
      if (item.userId === userId || item._id === userId) {
        return { ...item, isDove: selectedDoves.includes(userId) }
      }
      return item
    })
    
    this.setData({ selectedDoves, activitySignups })
  },

  // 确认提交放鸽子记录
  confirmDoves: function() {
    const { selectedDoves, activitySignups, selectedActivity } = this.data
    
    if (selectedDoves.length === 0) {
      wx.showToast({ title: '请选择放鸽子的用户', icon: 'none' })
      return
    }
    
    const that = this
    wx.showModal({
      title: '确认提交',
      content: `确定将 ${selectedDoves.length} 位用户标记为放鸽子？`,
      success: function(res) {
        if (res.confirm) {
          that.saveDoveRecords()
        }
      }
    })
  },

  // 保存放鸽子记录
  saveDoveRecords: function() {
    const { selectedDoves, activitySignups, selectedActivity } = this.data
    
    wx.showLoading({ title: '保存中...' })
    
    const that = this
    const activity = this.data.activities.find(a => a._id === selectedActivity)
    
    // 先检查 doves 集合是否存在
    this.checkAndInitDovesCollection(function() {
      // 集合已存在或创建成功，开始保存记录
      that.saveDoveRecordsToDatabase(selectedDoves, activitySignups, selectedActivity, activity)
    })
  },
  
  // 检查并初始化 doves 集合（使用云函数）
  checkAndInitDovesCollection: function(callback) {
    const that = this
    
    // 先尝试查询 doves 集合
    db.collection('doves').limit(1).get({
      success: function(res) {
        // console.log('doves 集合已存在')
        callback()
      },
      fail: function(err) {
        // 如果集合不存在，调用云函数创建
        if (err.errCode === -502005) {
          // console.log('doves 集合不存在，调用云函数创建...')
          wx.cloud.callFunction({
            name: 'initDovesCollection',
            success: function(res) {
              // console.log('云函数返回:', JSON.stringify(res))
              if (res.result && res.result.success) {
                // console.log('doves 集合创建成功:', res.result.message)
                callback()
              } else {
                const errorMsg = (res.result && res.result.error) || '未知错误'
                const errorMessage = (res.result && res.result.message) || '创建失败'
                // console.error('云函数创建集合失败:', errorMessage, errorMsg)
                wx.hideLoading()
                wx.showToast({
                  title: errorMessage,
                  icon: 'none'
                })
              }
            },
            fail: function(createErr) {
              // console.error('调用云函数失败:', createErr)
              wx.hideLoading()
              wx.showToast({
                title: '调用云函数失败',
                icon: 'none'
              })
            }
          })
        } else {
          // console.error('检查 doves 集合失败:', err)
          wx.hideLoading()
          wx.showToast({
            title: '检查数据库失败',
            icon: 'none'
          })
        }
      }
    })
  },
  
  // 保存鸽子记录到数据库
  saveDoveRecordsToDatabase: function(selectedDoves, activitySignups, selectedActivity, activity) {
    const that = this
    
    wx.showLoading({ title: '保存中...' })
    
    // 先获取已有的鸽子记录
    db.collection('doves').where({
      activityId: selectedActivity
    }).get({
      success: function(existingRes) {
        const existingDoves = existingRes.data || []
        const existingUserIds = existingDoves.map(item => item.userId)
        
        // 需要删除的鸽子（已存在但不在新选择列表中）
        const toDelete = existingDoves.filter(item => !selectedDoves.includes(item.userId))
        
        // 需要添加的鸽子（新选择但不存在）
        const toAdd = selectedDoves.filter(userId => !existingUserIds.includes(userId))
        
        let processedCount = 0
        const totalOperations = toDelete.length + toAdd.length
        
        // 如果没有任何操作，直接完成
        if (totalOperations === 0) {
          wx.hideLoading()
          wx.showToast({ title: '没有变更', icon: 'none' })
          that.closeDoveModal()
          return
        }
        
        // 删除需要取消的鸽子记录
        toDelete.forEach(dove => {
          db.collection('doves').doc(dove._id).remove({
            success: function() {
              // console.log('删除鸽子记录成功:', dove.userId)
              processedCount++
              checkComplete()
            },
            fail: function(err) {
              // console.error('删除鸽子记录失败:', err)
              processedCount++
              checkComplete()
            }
          })
        })
        
        // 添加新的鸽子记录
        toAdd.forEach(userId => {
          const user = activitySignups.find(item => item.userId === userId || item._id === userId)
          
          db.collection('doves').add({
            data: {
              activityId: selectedActivity,
              activityTitle: activity ? activity.title : '',
              activityDate: activity ? activity.date : '',
              userId: userId,
              nickName: user ? user.nickName : '未知用户',
              avatarUrl: user ? user.avatarUrl : '',
              createTime: new Date()
            },
            success: function(res) {
              // console.log('添加鸽子记录成功:', userId)
              processedCount++
              checkComplete()
            },
            fail: function(err) {
              // console.error('添加鸽子记录失败:', err)
              processedCount++
              checkComplete()
            }
          })
        })
        
        // 检查是否所有操作完成
        function checkComplete() {
          if (processedCount === totalOperations) {
            wx.hideLoading()
            wx.showToast({ 
              title: `已更新 ${toAdd.length} 个鸽子，取消 ${toDelete.length} 个鸽子`, 
              icon: 'success' 
            })
            that.closeDoveModal()
            that.loadActivities()
          }
        }
      },
      fail: function(err) {
        // console.error('获取现有鸽子记录失败:', err)
        wx.hideLoading()
        wx.showToast({ title: '保存失败', icon: 'none' })
      }
    })
  },
  
  // 标记活动为已确认鸽子状态
  markActivityConfirmed: function(activityId) {
    const that = this
    
    // 更新活动状态为已确认
    db.collection('activities').doc(activityId).update({
      data: {
        doveConfirmed: true,
        doveConfirmTime: new Date()
      },
      success: function() {
        // console.log('活动已标记为确认鸽子:', activityId)
        wx.hideLoading()
        wx.showToast({ title: '确认成功', icon: 'success' })
        that.closeDoveModal()
        // 重新加载活动列表，已确认的活动会被过滤掉
        that.loadActivities()
      },
      fail: function(err) {
        // console.error('标记活动确认失败:', err)
        wx.hideLoading()
        wx.showToast({ title: '保存成功', icon: 'success' })
        that.closeDoveModal()
      }
    })
  },

  // 关闭放鸽子弹窗
  closeDoveModal: function() {
    this.setData({ 
      showDoveModal: false, 
      selectedActivity: '', 
      activitySignups: [], 
      selectedDoves: [] 
    })
  }
})
