const db = wx.cloud.database()

// 首页数据统计函数
// 功能：统计总活动数、本周活动数、平均报名人数、活跃用户
// 参数：activityList - 活动数组，来自报名页面
function calculateHomeStats(activityList) {
  // ========== 1. 总活动数 ==========
  // 直接返回活动数组的长度
  const totalActivities = activityList.length
  
  // ========== 2. 获取本周的日期范围（周一到周日）==========
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const currentDate = now.getDate()
  const dayOfWeek = now.getDay() // 0=周日, 1=周一, ... 6=周六
  
  // 计算本周一的日期
  // 如果是周日（dayOfWeek=0），需要往前推6天
  // 其他天数，往前推 dayOfWeek-1 天
  const monday = new Date(now)
  monday.setDate(currentDate - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  monday.setHours(0, 0, 0, 0)
  
  // 计算本周日的日期（本周一 + 6天）
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  
  // 本周范围计算完成
  // monday: 本周一 00:00:00
  // sunday: 本周日 23:59:59
  
  // ========== 3. 筛选本周活动 ==========
  // 遍历活动数组，筛选出日期在本周范围内的活动
  const weeklyActivities = activityList.filter(activity => {
    // 处理日期格式：支持 '2026-06-05' 或 '2026-6-5' 格式
    const dateParts = activity.date.split('-')
    const activityYear = parseInt(dateParts[0])
    const activityMonth = parseInt(dateParts[1]) - 1 // 月份从0开始
    const activityDay = parseInt(dateParts[2])
    
    const activityDate = new Date(activityYear, activityMonth, activityDay)
    activityDate.setHours(0, 0, 0, 0)
    
    // 返回日期在本周范围内的活动
    return activityDate >= monday && activityDate <= sunday
  })
  
  // console.log('本周活动:', weeklyActivities.map(a => `${a.title}(${a.date})`).join(', '))
  // console.log('本周活动数:', weeklyActivities.length)
  
  // ========== 4. 计算本周平均报名人数 ==========
  // 逻辑：先筛选本周活动，然后累加报名人数，最后除以活动数量
  let averageParticipants = 0
  
  if (weeklyActivities.length > 0) {
    // 累加本周所有活动的报名人数
    let totalSignups = 0
    weeklyActivities.forEach(activity => {
      // 使用 currentParticipants 字段，如果不存在则使用 signups 数组长度
      const participants = activity.currentParticipants || 
                         (activity.signups && activity.signups.length) || 0
      totalSignups += participants
      // console.log(`活动 "${activity.title}" 报名人数: ${participants}`)
    })
    
    // 计算平均值，保留2位小数
    averageParticipants = Number((totalSignups / weeklyActivities.length).toFixed(2))
    // console.log('本周总报名人数:', totalSignups)
    // console.log('平均报名人数:', averageParticipants)
  } else {
    // 如果本周没有活动，返回0
    // console.log('本周无活动，平均报名人数: 0')
  }
  
  // ========== 5. 返回统计结果 ==========
  return {
    totalActivities: totalActivities,           // 总活动数
    weeklyActivities: weeklyActivities.length, // 本周活动数
    averageParticipants: averageParticipants,   // 平均报名人数（保留2位小数）
    activeUsers: 1                              // 活跃用户（暂时固定返回1）
  }
}

Page({
  data: {
    isAdmin: true,  // 默认超级管理员
    currentActivity: null,  // 当前活动主题
    
    stats: {
      totalActivities: 0,
      ongoingActivities: 0,
      totalSignups: 0,
      activeUsers: 0,
      weeklyActivity: 0,
      avgSignups: 0,
      pendingCount: 0,
      leaveCount: 0,
      thisMonthActivities: 0,
      totalFees: 0
    },
    chartData: {
      labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      data: [12, 19, 3, 5, 2, 3, 7]
    },
    monthlyData: {
      labels: ['1月', '2月', '3月', '4月', '5月', '6月'],
      data: [8, 12, 15, 10, 18, 22]
    },
    activityTypeData: [],
    pieGradient: '',
    topPlayers: [],
    doveRankings: [],  // 鸽子榜数据
    statAnimationsDone: false  // 统计数字动画是否已完成
  },

  // 数字滚动动画（easeOutCubic 缓动）
  animateNumber: function(key, targetValue, duration) {
    const that = this
    duration = duration || 800
    const startTime = Date.now()
    
    const step = function() {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(targetValue * eased)
      
      const updateData = {}
      updateData[key] = current
      that.setData(updateData)
      
      if (progress < 1) {
        setTimeout(step, 16)
      } else {
        // 确保最终值精确
        const finalData = {}
        finalData[key] = targetValue
        that.setData(finalData)
      }
    }
    
    step()
  },

  // 触发所有统计卡片的数字滚动动画
  animateStatsCards: function() {
    const stats = this.data.stats
    // 每个数字错开一点时间，形成递进效果
    this.animateNumber('stats.totalActivities', stats.totalActivities, 600)
    setTimeout(() => {
      this.animateNumber('stats.ongoingActivities', stats.ongoingActivities, 600)
    }, 100)
    setTimeout(() => {
      this.animateNumber('stats.activeUsers', stats.activeUsers, 600)
    }, 200)
    setTimeout(() => {
      this.animateNumber('stats.totalFees', parseFloat(stats.totalFees) || 0, 600)
    }, 300)
    this.setData({ statAnimationsDone: true })
  },

  onLoad: function() {
    const that = this
    that.checkAdmin()
    setTimeout(() => {
      that.loadStats()
    }, 300)
  },

  onShow: function() {
    this.updateOnlineStatus()
    this.loadStats()
  },
  
  // 更新用户在线状态（记录用户访问小程序的时间）
  updateOnlineStatus: function() {
    // 获取当前用户的 openid
    wx.cloud.callFunction({
      name: 'getOpenId',
      success: function(res) {
        const openid = res.result.openid
        if (!openid) return
        
        // 更新或创建用户在线状态记录
        db.collection('visitors').where({
          _openid: openid
        }).get({
          success: function(res) {
            if (res.data.length > 0) {
              // 更新现有记录
              db.collection('visitors').doc(res.data[0]._id).update({
                data: {
                  lastActiveTime: db.serverDate()
                }
              })
            } else {
              // 创建新记录
              db.collection('visitors').add({
                data: {
                  _openid: openid,
                  lastActiveTime: db.serverDate()
                }
              })
            }
          }
        })
      }
    })
  },

  checkAdmin: function() {
    // 设置为超级管理员
    // console.log('index: 设置为超级管理员')
    this.setData({ isAdmin: true })
    
    // 原有逻辑（已注释）
    // const that = this
    // wx.cloud.callFunction({
    //   name: 'getOpenId',
    //   success: function(res) {
    //     const openId = res.result.openid
    //     if (openId) {
    //       that.setData({ openId: openId })
    //       that.checkAdminByOpenId(openId)
    //     }
    //   },
    //   fail: function(err) {
    //     // console.log('getOpenId error:', err)
    //   }
    // })
  },

  checkAdminByOpenId: function(openId) {
    const that = this
    db.collection('admins').where({
      openId: openId
    }).get({
      success: function(res) {
        if (res.data.length > 0) {
          that.setData({ isAdmin: true })
        }
      },
      fail: function() {
        // console.log('checkAdminByOpenId fail')
      }
    })
  },

  loadStats: function() {
    const that = this
    this.setData({ loading: true })
    
    that.loadActivityStats()
  },
  
  // 加载活动统计数据
  loadActivityStats: function() {
    const that = this
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    
    // 查询条件与报名页面一致：日期 >= 本月初 或者 日期为空/不存在
    db.collection('activities').where(db.command.or([
      { date: db.command.gte(startDate) },
      { date: '' },
      { date: db.command.exists(false) }
    ])).limit(200).get({
      timeout: 15000,
      success: function(res) {
        const monthlyActivities = res.data || []
        const dayOfWeek = now.getDay()
        
        // 计算本周日期范围（周一到周日）
        const monday = new Date(now)
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        monday.setDate(now.getDate() - daysToSubtract)
        monday.setHours(0, 0, 0, 0)
        
        const formatDateLocal = function(date) {
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        }
        
        const weekStart = formatDateLocal(monday)
        const weekEnd = formatDateLocal(new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000))
        const today = formatDateLocal(now)
        
        const normalizeDate = function(dateStr) {
          if (!dateStr) return null
          if (typeof dateStr === 'string') {
            const parts = dateStr.split('-')
            if (parts.length === 3) {
              return `${parts[0]}-${String(parseInt(parts[1])).padStart(2, '0')}-${String(parseInt(parts[2])).padStart(2, '0')}`
            }
          }
          return null
        }
        
        const daysUntilSaturday = dayOfWeek === 0 ? 6 : 6 - dayOfWeek
        const saturday = new Date(now)
        saturday.setDate(now.getDate() + daysUntilSaturday)
        const defaultDate = formatDateLocal(saturday)
        
        const weeklyActivities = monthlyActivities.filter(item => {
          // 无日期活动不计入本周统计
          if (!item.date) return false
          const activityDate = normalizeDate(item.date)
          if (!activityDate) return false
          const isInWeek = activityDate >= weekStart && activityDate <= weekEnd
          return isInWeek
        })
        
        // 更新统计数据
        that.setData({ 
          'stats.weeklyActivity': weeklyActivities.length
        })
        
        // 统计进行中的活动
        const ongoingActivities = monthlyActivities.filter(a => {
          if (a.status !== 'active') return false
          if (a.date && a.date < today) return false
          return true
        }).length
        that.setData({ 'stats.ongoingActivities': ongoingActivities })
        
        that.loadWeeklySignupCount(weeklyActivities)
        
        // 并行加载其他数据，提升首页加载速度
        that.loadCurrentActivity(monthlyActivities)
        that.loadWeeklyTrendData()
        that.loadMonthlyData()
        that.loadActivityTypeData()
        that.loadTopPlayersFromDatabase()
        that.loadTotalFees()
        that.loadDoveRankings()
        // 数据加载完成后触发统计数字滚动动画
        setTimeout(() => {
          that.animateStatsCards()
        }, 400)
      },
      fail: function() {
        // 查询失败，使用默认值
      }
    })
    
    // 单独查询总活动数（所有历史活动）
    db.collection('activities').limit(200).get({
      timeout: 15000,
      success: function(res) {
        const allActivities = res.data || []
        that.setData({ 'stats.totalActivities': allActivities.length })
      }
    })
  },
  
  // 加载本周报名人数统计和活跃用户
  loadWeeklySignupCount: function(weeklyActivities) {
    const that = this
    if (!weeklyActivities || weeklyActivities.length === 0) {
      that.setData({ 'stats.avgSignups': 0, 'stats.activeUsers': 0 })
      return
    }
    
    // 获取本周活动的ID列表（同时包含 id 和 _id，因为报名记录可能使用任一ID保存）
    const activityIds = []
    const activityIdSet = new Set()
    weeklyActivities.forEach(a => {
      if (a._id && !activityIdSet.has(a._id)) {
        activityIds.push(a._id)
        activityIdSet.add(a._id)
      }
      if (a.id && a.id !== a._id && !activityIdSet.has(a.id)) {
        activityIds.push(a.id)
        activityIdSet.add(a.id)
      }
    })
    
    const timer = setTimeout(() => {
      // 查询超时，使用活动对象中的signups字段
      let totalSignups = 0
      const activeUsers = new Set()
      weeklyActivities.forEach(activity => {
        if (activity.signups && Array.isArray(activity.signups)) {
          totalSignups += activity.signups.length
          activity.signups.forEach(user => {
            if (user.userId || user.nickName) {
              activeUsers.add(user.userId || user.nickName)
            }
          })
        }
      })
      const avgSignups = Number((totalSignups / weeklyActivities.length).toFixed(2))
      that.setData({ 
        'stats.avgSignups': avgSignups,
        'stats.activeUsers': activeUsers.size
      })
    }, 5000)
    
    // 先查询所有报名记录，然后匹配本周活动
    db.collection('signups').limit(500).get({
      timeout: 5000,
      success: function(res) {
        clearTimeout(timer)
        const allSignups = res.data || []
        
        const signupByActivity = new Map()
        allSignups.forEach(signup => {
          if (signup.status === 'pending' || signup.status === 'leave') return
          
          const actId = signup.activityId
          if (!actId || actId === '') return
          if (!signupByActivity.has(actId)) {
            signupByActivity.set(actId, new Set())
          }
          signupByActivity.get(actId).add(signup.userId || signup.nickName || signup._id)
        })
        
        let totalSignups = 0
        const activeUsers = new Set()
        
        weeklyActivities.forEach(activity => {
          const possibleIds = []
          if (activity._id) possibleIds.push(activity._id)
          if (activity.id && activity.id !== activity._id) possibleIds.push(activity.id)
          
          possibleIds.forEach(id => {
            if (signupByActivity.has(id)) {
              const users = signupByActivity.get(id)
              totalSignups += users.size
              users.forEach(userKey => {
                activeUsers.add(userKey)
              })
            }
          })
        })
        
        const avgSignups = Math.round(totalSignups / weeklyActivities.length)
        
        that.setData({ 
          'stats.avgSignups': avgSignups,
          'stats.activeUsers': activeUsers.size
        })
      },
      fail: function() {
        clearTimeout(timer)
        let totalSignups = 0
        const activeUsers = new Set()
        weeklyActivities.forEach(activity => {
          if (activity.signups && Array.isArray(activity.signups)) {
            totalSignups += activity.signups.length
            activity.signups.forEach(user => {
              if (user.userId || user.nickName) {
                activeUsers.add(user.userId || user.nickName)
              }
            })
          }
        })
        const avgSignups = Number((totalSignups / weeklyActivities.length).toFixed(2))
        that.setData({ 
          'stats.avgSignups': avgSignups,
          'stats.activeUsers': activeUsers.size
        })
      }
    })
  },

// 加载活动类型数据（从数据库查询）
loadActivityTypeData: function() {
  const that = this
  
  db.collection('activities').limit(200).get({
    timeout: 15000,
    success: function(res) {
      const activities = res.data || []
      
      const normalizeTypeName = function(type) {
        if (!type) return '其他'
        type = type.toString().trim()
        type = type.replace(/[\uFEFF\u200B\u200C\u200D\u2060\u3000]/g, '')
        type = type.replace(/[\s\t\n\r]/g, '')
        const fullWidthMap = {
          '１': '1', '２': '2', '３': '3', '４': '4', '５': '5',
          '６': '6', '７': '7', '８': '8', '９': '9', '０': '0',
          '（': '(', '）': ')', '，': ',', '。': '.', '：': ':'
        }
        type = type.replace(/[\uFF01-\uFF5E]/g, function(char) {
          return String.fromCharCode(char.charCodeAt(0) - 0xFEE0)
        })
        type = type.replace(/[\u3000-\u303F]/g, '')
        const typeNameMap = {
          '爬山': '爬山', '爬': '爬山', '爬爬山': '爬山',
          '吃饭': '吃饭', '吃': '吃饭', '聚餐': '吃饭', '聚餐吃饭': '吃饭',
          '游泳': '游泳', '游': '游泳', '游咏': '游泳', '咏游': '游泳',
          '唱歌': '唱歌', '唱': '唱歌', 'K歌': '唱歌', 'k歌': '唱歌',
          '其他': '其他', '其': '其他', '未知': '其他', '未分类': '其他',
          '跑步': '跑步', '跑': '跑步', '慢跑': '跑步',
          '骑行': '骑行', '骑车': '骑行', '单车': '骑行', '自行车': '骑行',
          '羽毛球': '羽毛球', '羽球': '羽毛球', '打羽毛球': '羽毛球',
          '篮球': '篮球', '打球': '篮球', '打篮球': '篮球',
          '健身': '健身', '健身房': '健身', '锻炼': '健身',
          '瑜伽': '瑜伽', '瑜珈': '瑜伽',
          '电影': '电影', '看电影': '电影', '观影': '电影',
          '旅游': '旅游', '旅行': '旅游', '游玩': '旅游',
          '烧烤': '烧烤', 'BBQ': '烧烤', 'bbq': '烧烤',
          '露营': '露营', '野营': '露营',
          '桌游': '桌游', '桌面游戏': '桌游',
          '麻将': '麻将', '打麻将': '麻将',
          '剧本杀': '剧本杀', '角色扮演': '剧本杀',
          '温泉': '温泉', '泡温泉': '温泉',
          '台球': '台球', '桌球': '台球',
          '网球': '网球', '打网球': '网球',
          '排球': '排球', '打排球': '排球',
          '保龄球': '保龄球', '保龄': '保龄球',
          '高尔夫': '高尔夫', '高尔夫球': '高尔夫',
          '滑雪': '滑雪', '滑冰': '滑雪',
          '攀岩': '攀岩', '攀登': '攀岩',
          '潜水': '潜水', '浮潜': '潜水',
          '冲浪': '冲浪',
          '咖啡': '咖啡', '喝咖啡': '咖啡',
          '奶茶': '奶茶', '喝奶茶': '奶茶',
          '下午茶': '下午茶',
          '钓鱼': '钓鱼', '垂钓': '钓鱼',
          '棋牌': '棋牌', '下棋': '棋牌',
          '密室逃脱': '密室逃脱', '密室': '密室逃脱',
          'KTV': 'KTV', '唱歌KTV': 'KTV',
          '蹦迪': '蹦迪', '迪斯科': '蹦迪',
          '酒吧': '酒吧', '泡吧': '酒吧',
          'SPA': 'SPA', '按摩': '按摩', '推拿': '按摩',
          '队内赛': '队内赛', '内部比赛': '队内赛',
          '训练赛': '训练赛', '训练': '训练赛',
          '友谊赛': '友谊赛', '友谊': '友谊赛', '交流赛': '友谊赛'
        }
        return typeNameMap[type] || type
      }
      
      const typeCount = {}
      activities.forEach(activity => {
        let type = activity.type || activity.activityType || '其他'
        type = normalizeTypeName(type)
        typeCount[type] = (typeCount[type] || 0) + 1
      })
      
      const total = Object.values(typeCount).reduce((sum, count) => sum + count, 0)
      
      const vividColors = [
        '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
        '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#06b6d4',
        '#f43f5e', '#fb923c', '#facc15', '#4ade80', '#2dd4bf',
        '#60a5fa', '#a78bfa', '#f472b6', '#818cf8', '#22d3ee'
      ]
      
      const activityTypeData = Object.keys(typeCount).map((key, index) => ({
        name: key,
        value: total > 0 ? Math.round((typeCount[key] / total) * 100) : 0,
        color: vividColors[index % vividColors.length]
      }))
      
      activityTypeData.sort((a, b) => b.value - a.value)
      
      let pieGradient = ''
      let currentAngle = 0
      activityTypeData.forEach(item => {
        const angle = (item.value / 100) * 360
        const startAngle = currentAngle
        const endAngle = currentAngle + angle
        pieGradient += `${item.color} ${startAngle}deg ${endAngle}deg,`
        currentAngle = endAngle
      })
      pieGradient = pieGradient.slice(0, -1) || '#ef4444 0deg 360deg'
      
      that.setData({ 
        activityTypeData: activityTypeData,
        pieGradient: pieGradient
      })
    },
    fail: function(err) {
      that.setData({
        activityTypeData: [
          { name: '队内赛', value: 40, color: '#ef4444' },
          { name: '训练赛', value: 30, color: '#3b82f6' },
          { name: '吃饭', value: 15, color: '#f97316' },
          { name: '友谊赛', value: 15, color: '#22c55e' }
        ],
        pieGradient: '#ef4444 0deg 144deg, #3b82f6 144deg 252deg, #f97316 252deg 306deg, #22c55e 306deg 360deg'
      })
    }
  })
},

// 从数据库加载热门球员（报名最多的球员）
loadTopPlayersFromDatabase: function() {
  const that = this
  
  db.collection('signups').limit(200).get({
    timeout: 15000,
    success: function(res) {
      const signups = res.data || []
      
      const playerMap = new Map()
      signups.forEach(signup => {
        if (signup.status === 'pending' || signup.status === 'leave') return
        const userName = signup.nickName || signup.userId || signup._openid || '未知用户'
        
        if (!playerMap.has(userName)) {
          playerMap.set(userName, {
            _id: userName,
            userId: signup.userId || signup._openid || userName,
            nickName: userName,
            avatarUrl: signup.avatarUrl || '',
            count: 0
          })
        } else {
          const existing = playerMap.get(userName)
          if (!existing.avatarUrl && signup.avatarUrl) {
            existing.avatarUrl = signup.avatarUrl
          }
        }
        playerMap.get(userName).count++
      })
      
      let topPlayers = Array.from(playerMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
      
      that.setData({ topPlayers: topPlayers.length > 0 ? topPlayers : [] })
      
      that.fetchPlayerAvatars(topPlayers)
    },
    fail: function() {
      that.setData({ topPlayers: [] })
    }
  })
},

fetchPlayerAvatars: function(players) {
  const that = this
  if (!players || players.length === 0) return
  
  const playersWithMissingAvatar = players.filter(p => !p.avatarUrl)
  if (playersWithMissingAvatar.length === 0) return
  
  const nickNames = playersWithMissingAvatar.map(p => p.nickName)
  
  const avatarMap = new Map()
  
  db.collection('users').where({
    nickName: db.command.in(nickNames)
  }).get({
    timeout: 10000,
    success: function(res) {
      const users = res.data || []
      users.forEach(u => {
        if (u.nickName && u.avatarUrl) {
          avatarMap.set(u.nickName, u.avatarUrl)
        }
      })
      
      const stillMissing = playersWithMissingAvatar.filter(p => !avatarMap.has(p.nickName))
      if (stillMissing.length > 0) {
        const missingNames = stillMissing.map(p => p.nickName)
        db.collection('signups').where({
          nickName: db.command.in(missingNames)
        }).limit(100).get({
          timeout: 10000,
          success: function(signupRes) {
            const signups = signupRes.data || []
            signups.forEach(s => {
              if (s.nickName && s.avatarUrl && !avatarMap.has(s.nickName)) {
                avatarMap.set(s.nickName, s.avatarUrl)
              }
            })
            
            const updatedPlayers = players.map(p => {
              if (!p.avatarUrl && avatarMap.has(p.nickName)) {
                p.avatarUrl = avatarMap.get(p.nickName)
              }
              return p
            })
            
            that.setData({ topPlayers: updatedPlayers })
          },
          fail: function() {
            const updatedPlayers = players.map(p => {
              if (!p.avatarUrl && avatarMap.has(p.nickName)) {
                p.avatarUrl = avatarMap.get(p.nickName)
              }
              return p
            })
            that.setData({ topPlayers: updatedPlayers })
          }
        })
      } else {
        const updatedPlayers = players.map(p => {
          if (!p.avatarUrl && avatarMap.has(p.nickName)) {
            p.avatarUrl = avatarMap.get(p.nickName)
          }
          return p
        })
        that.setData({ topPlayers: updatedPlayers })
      }
    },
    fail: function() {
      db.collection('signups').where({
        nickName: db.command.in(nickNames)
      }).limit(100).get({
        timeout: 10000,
        success: function(res) {
          const signups = res.data || []
          signups.forEach(s => {
            if (s.nickName && s.avatarUrl) {
              avatarMap.set(s.nickName, s.avatarUrl)
            }
          })
          
          const updatedPlayers = players.map(p => {
            if (!p.avatarUrl && avatarMap.has(p.nickName)) {
              p.avatarUrl = avatarMap.get(p.nickName)
            }
            return p
          })
          
          that.setData({ topPlayers: updatedPlayers })
        }
      })
    }
  })
},

// 加载月度活动数据（统计所有活动的月度分布）
loadMonthlyData: function() {
  const that = this
  
  db.collection('activities').limit(200).get({
    timeout: 15000,
    success: function(res) {
      const activities = res.data || []
      
      const monthLabels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
      const monthlyData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      let noDateCount = 0
      
      activities.forEach(activity => {
        if (activity.date) {
          const dateParts = activity.date.split('-')
          if (dateParts.length >= 3) {
            const month = parseInt(dateParts[1]) - 1
            if (month >= 0 && month < 12) {
              monthlyData[month]++
            }
          }
        } else {
          // 无日期活动不计入月度统计，避免数据偏差
          noDateCount++
        }
      })
      
      // 无日期活动不强制归入当前月，保持月度统计准确
      // const now = new Date()
      // const currentMonth = now.getMonth()
      // monthlyData[currentMonth] += noDateCount
      
      const total = monthlyData.reduce((sum, count) => sum + count, 0)
      
      that.setData({
        'monthlyData.labels': monthLabels,
        'monthlyData.data': monthlyData
      })
    },
    fail: function() {
      const monthLabels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
      that.setData({
        'monthlyData.labels': monthLabels,
        'monthlyData.data': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      })
    }
  })
},

// 统计活跃用户（正在操作小程序的用户数）
  loadActiveUsers: function() {
    const that = this
    
    // 先尝试从 visitors 集合查询当前在线的用户数
    db.collection('visitors').where({
      lastActiveTime: db.command.gte(new Date(Date.now() - 5 * 60 * 1000)) // 5 分钟内有活动的用户
    }).get({
      success: function(res) {
        const visitors = res.data || []
        // 去重统计活跃用户数
        const activeUserIds = new Set()
        visitors.forEach(visitor => {
          if (visitor._openid) {
            activeUserIds.add(visitor._openid)
          }
        })
        
        let activeUsers = activeUserIds.size
        
        // 如果在线用户数为0，使用报名用户数作为活跃用户数
        if (activeUsers === 0) {
          db.collection('signups').where({
            status: 'signups'
          }).get({
            success: function(res) {
              const signups = res.data || []
              const signupUserIds = new Set()
              signups.forEach(signup => {
                if (signup._openid) signupUserIds.add(signup._openid)
                else if (signup.userId) signupUserIds.add(signup.userId)
              })
              
              const finalCount = signupUserIds.size > 0 ? signupUserIds.size : 1
              that.setData({ 'stats.activeUsers': finalCount })
              // console.log('=== 活跃用户统计 ===')
              // console.log('使用报名用户数:', finalCount)
            },
            fail: function() {
              // 如果都查询不到，默认显示1（当前用户）
              that.setData({ 'stats.activeUsers': 1 })
              // console.log('=== 活跃用户统计 ===')
              // console.log('使用默认值:', 1)
            }
          })
        } else {
          that.setData({ 'stats.activeUsers': activeUsers })
          // console.log('=== 活跃用户统计 ===')
          // console.log('在线用户数:', activeUsers)
        }
      },
      fail: function(err) {
        // console.error('查询活跃用户失败:', err)
        // 使用报名用户数作为活跃用户数
        db.collection('signups').where({
          status: 'signups'
        }).get({
          success: function(res) {
            const signups = res.data || []
            const signupUserIds = new Set()
            signups.forEach(signup => {
              if (signup._openid) signupUserIds.add(signup._openid)
              else if (signup.userId) signupUserIds.add(signup.userId)
            })
            
            const finalCount = signupUserIds.size > 0 ? signupUserIds.size : 1
            that.setData({ 'stats.activeUsers': finalCount })
            // console.log('=== 活跃用户统计 ===')
            // console.log('使用报名用户数:', finalCount)
          },
          fail: function() {
            // 如果都查询不到，默认显示1（当前用户）
            that.setData({ 'stats.activeUsers': 1 })
            // console.log('=== 活跃用户统计 ===')
            // console.log('使用默认值:', 1)
          }
        })
      }
    })
  },

  // 加载累计费用（从记账 records 集合统计）
  loadTotalFees: function() {
    const that = this
    
    db.collection('records').limit(500).get({
      timeout: 15000,
      success: function(res) {
        let totalIncome = 0
        let totalExpense = 0
        if (res && res.data) {
          res.data.forEach(item => {
            const amount = parseFloat(item.amount || 0)
            if (item.type === 'income') {
              totalIncome += amount
            } else {
              totalExpense += amount
            }
          })
        }
        const balance = (totalIncome - totalExpense).toFixed(2)
        that.setData({ 
          'stats.totalFees': balance,
          'stats.totalIncome': totalIncome.toFixed(2),
          'stats.totalExpense': totalExpense.toFixed(2)
        })
      },
      fail: function() {
        // 查询失败，使用默认值
      }
    })
  },
  
  // 加载本周活动统计和趋势数据（已废弃，保留为空函数）
  loadWeeklyStats: function() {
    // 此函数已废弃，统计逻辑已移至 loadStats 函数
  },
  
  // 计算本周平均报名人数
  calculateWeeklyAverageSignups: function(weeklyActivities) {
    const that = this
    
    if (weeklyActivities.length === 0) {
      that.setData({ 'stats.avgSignups': 0 })
      return
    }
    
    // 统计报名人数
    let totalSignups = 0
    weeklyActivities.forEach(activity => {
      if (activity.signups && activity.signups.length) {
        totalSignups += activity.signups.length
      } else if (activity.signupCount) {
        totalSignups += activity.signupCount
      }
    })
    
    // 计算平均报名人数
    const avgSignups = Math.round(totalSignups / weeklyActivities.length)
    that.setData({ 'stats.avgSignups': avgSignups })
    // console.log('本周平均报名:', avgSignups, '人/场，总报名:', totalSignups, '活动数:', weeklyActivities.length)
  },
  
  // 加载本周活动统计和趋势数据（使用传入的 activities 数据）
  loadWeeklyStatsWithActivities: function(activities) {
    const that = this
    const now = new Date()
    
    // 获取本周日期范围
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    
    const weekStart = monday.toISOString().split('T')[0]
    const weekEnd = sunday.toISOString().split('T')[0]
    
    // console.log('本周范围:', weekStart, '-', weekEnd)
    
    // 筛选本周活动
    const weeklyActivities = activities.filter(activity => {
      return activity.date >= weekStart && activity.date <= weekEnd
    })
    
    // console.log('所有活动:', activities.map(a => `${a.title}(${a.date})`).join(', '))
    // console.log('本周活动:', weeklyActivities.map(a => `${a.title}(${a.date})`).join(', '))
    // console.log('本周活动数:', weeklyActivities.length)
    that.setData({ 'stats.weeklyActivity': weeklyActivities.length })
    
    // 计算本周平均报名人数
    that.calculateWeeklyAverageSignups(weeklyActivities)
    
    // 统计本周每天的报名数据（趋势数据）
    that.loadWeeklyTrendData()
  },
  
  // 加载本周趋势数据（每天的报名人数）
  loadWeeklyTrendData: function() {
    const that = this
    
    // 获取本周每天的日期
    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    monday.setHours(0, 0, 0, 0)
    
    // 使用本地日期格式化，避免时区问题
    const formatDateLocal = function(date) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    // 创建本周每天的日期数组 [周一, 周二, ..., 周日]
    const weekDays = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      weekDays.push(formatDateLocal(date))
    }
    
    // console.log('=== loadWeeklyTrendData ===')
    // console.log('当前日期:', formatDateLocal(now))
    // console.log('当前星期:', dayOfWeek)
    // console.log('本周一:', formatDateLocal(monday))
    // console.log('本周日期:', weekDays.map((d, i) => `${i}:${d}`).join(', '))
    
    // 查询条件与报名页面一致：日期 >= 本月初 或者 日期为空/不存在
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    
    // 先查询活动列表，筛选出本周活动
    db.collection('activities').where(db.command.or([
      { date: db.command.gte(startDate) },
      { date: '' },
      { date: db.command.exists(false) }
    ])).limit(500).get({
      success: function(activityRes) {
        const activities = activityRes.data || []
        
        // 计算本周六日期（与报名页面一致）
        const saturday = new Date(now)
        const daysUntilSaturday = dayOfWeek === 0 ? 6 : 6 - dayOfWeek
        saturday.setDate(now.getDate() + daysUntilSaturday)
        const defaultDate = formatDateLocal(saturday)
        
        // 筛选本周活动（日期在本周范围内，日期为空的活动使用本周六日期）
        const weeklyActivities = activities.filter(activity => {
          const activityDate = activity.date || defaultDate
          return weekDays.includes(activityDate)
        })
        
        // 按日期统计活动数量（初始化为0）
        const dailyActivityCount = [0, 0, 0, 0, 0, 0, 0]
        
        // 统计每天有多少个活动
        weeklyActivities.forEach(activity => {
          const activityDate = activity.date || defaultDate
          const dayIndex = weekDays.indexOf(activityDate)
          if (dayIndex >= 0 && dayIndex < 7) {
            dailyActivityCount[dayIndex]++
          }
        })
        
        that.setData({
          'chartData.data': dailyActivityCount
        })
      },
      fail: function() {
        that.setData({
          'chartData.data': [0, 0, 0, 0, 0, 0, 0]
        })
      }
    })
  },
  
  // 加载当前活动主题
  loadCurrentActivity: function() {
    const that = this
    db.collection('activities').where({
      status: 'active'
    }).orderBy('createTime', 'desc').get({
      success: function(res) {
        let currentActivity = null
        
        if (res && res.data && res.data.length > 0) {
          // 获取最新的进行中活动
          currentActivity = res.data[0]
          // console.log('当前活动:', currentActivity)
        } else {
          // 如果没有进行中的活动，添加模拟数据
          currentActivity = {
            _id: '1',
            title: '周六友谊赛',
            date: '2026-06-14',
            time: '周六 晚上 8:00',
            location: '五缘湾足球场',
            description: '本周六晚上8点，五缘湾足球场，欢迎大家报名参加！',
            maxPlayers: 15,
            status: 'active',
            signupCount: 8
          }
        }
        
        that.setData({ currentActivity: currentActivity })
      },
      fail: function() {
        // 使用模拟数据
        that.setData({ 
          currentActivity: {
            _id: '1',
            title: '周六友谊赛',
            date: '2026-06-14',
            time: '周六 晚上 8:00',
            location: '五缘湾足球场',
            description: '本周六晚上8点，五缘湾足球场，欢迎大家报名参加！',
            maxPlayers: 15,
            status: 'active',
            signupCount: 8
          }
        })
      }
    })
  },

  // 加载鸽子榜数据
  loadDoveRankings: function() {
    const that = this
    db.collection('doves').limit(100).get({
      timeout: 15000,
      success: function(res) {
        const doves = res && res.data ? res.data : []
        const userMap = new Map()
        
        doves.forEach(item => {
          const userId = item.userId
          const nickName = item.nickName
          const avatarUrl = item.avatarUrl
          
          if (!nickName) return
          
          if (userMap.has(nickName)) {
            userMap.get(nickName).count++
            const existing = userMap.get(nickName)
            if (!existing.avatarUrl && avatarUrl) {
              existing.avatarUrl = avatarUrl
            }
            if (!existing.userId && userId) {
              existing.userId = userId
            }
          } else {
            userMap.set(nickName, {
              userId: userId,
              nickName: nickName,
              avatarUrl: avatarUrl,
              count: 1
            })
          }
        })
        
        let doveRankings = Array.from(userMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map((item, index) => ({ 
            userId: item.userId || item.nickName,
            nickName: item.nickName,
            avatarUrl: item.avatarUrl,
            count: item.count,
            rank: index + 1 
          }))
        
        that.setData({ doveRankings: doveRankings })
        
        that.fetchDoveAvatars(doveRankings)
      },
      fail: function() {
        that.setData({ doveRankings: [] })
      }
    })
  },

  fetchDoveAvatars: function(doves) {
    const that = this
    if (!doves || doves.length === 0) return
    
    const dovesWithMissingAvatar = doves.filter(d => !d.avatarUrl)
    if (dovesWithMissingAvatar.length === 0) return
    
    const nickNames = dovesWithMissingAvatar.map(d => d.nickName)
    
    const avatarMap = new Map()
    
    // 从 users 集合获取头像
    db.collection('users').where({
      nickName: db.command.in(nickNames)
    }).get({
      timeout: 10000,
      success: function(res) {
        const users = res.data || []
        users.forEach(u => {
          if (u.nickName && u.avatarUrl) {
            avatarMap.set(u.nickName, u.avatarUrl)
          }
        })
        
        // 如果还有缺失的头像，从 signups 集合获取
        const stillMissing = dovesWithMissingAvatar.filter(d => !avatarMap.has(d.nickName))
        if (stillMissing.length > 0) {
          const missingNames = stillMissing.map(d => d.nickName)
          db.collection('signups').where({
            nickName: db.command.in(missingNames)
          }).limit(100).get({
            timeout: 10000,
            success: function(signupRes) {
              const signups = signupRes.data || []
              signups.forEach(s => {
                if (s.nickName && s.avatarUrl && !avatarMap.has(s.nickName)) {
                  avatarMap.set(s.nickName, s.avatarUrl)
                }
              })
              
              const updatedDoves = doves.map(d => {
                if (!d.avatarUrl && avatarMap.has(d.nickName)) {
                  d.avatarUrl = avatarMap.get(d.nickName)
                }
                return d
              })
              
              that.setData({ doveRankings: updatedDoves })
            },
            fail: function() {
              const updatedDoves = doves.map(d => {
                if (!d.avatarUrl && avatarMap.has(d.nickName)) {
                  d.avatarUrl = avatarMap.get(d.nickName)
                }
                return d
              })
              that.setData({ doveRankings: updatedDoves })
            }
          })
        } else {
          const updatedDoves = doves.map(d => {
            if (!d.avatarUrl && avatarMap.has(d.nickName)) {
              d.avatarUrl = avatarMap.get(d.nickName)
            }
            return d
          })
          that.setData({ doveRankings: updatedDoves })
        }
      },
      fail: function() {
        // 如果 users 查询失败，直接从 signups 集合获取
        db.collection('signups').where({
          nickName: db.command.in(nickNames)
        }).limit(100).get({
          timeout: 10000,
          success: function(res) {
            const signups = res.data || []
            signups.forEach(s => {
              if (s.nickName && s.avatarUrl) {
                avatarMap.set(s.nickName, s.avatarUrl)
              }
            })
            
            const updatedDoves = doves.map(d => {
              if (!d.avatarUrl && avatarMap.has(d.nickName)) {
                d.avatarUrl = avatarMap.get(d.nickName)
              }
              return d
            })
            
            that.setData({ doveRankings: updatedDoves })
          }
        })
      }
    })
  },
  
  // 跳转到用户主页
  goToUserProfile: function(e) {
    let userId = ''
    let nickName = ''
    let avatarUrl = ''
    
    // 尝试从 currentTarget 获取数据
    if (e.currentTarget && e.currentTarget.dataset) {
      userId = e.currentTarget.dataset.userId || ''
      nickName = e.currentTarget.dataset.nickName || ''
      avatarUrl = e.currentTarget.dataset.avatarUrl || ''
    }
    
    // 如果 currentTarget 没有数据，尝试从 target 获取
    if (!userId && !nickName && e.target && e.target.dataset) {
      userId = e.target.dataset.userId || ''
      nickName = e.target.dataset.nickName || ''
      avatarUrl = e.target.dataset.avatarUrl || ''
    }
    
    // 如果 userId 和 nickName 都为空，则不跳转
    if (!userId && !nickName) {
      wx.showToast({ title: '用户信息无效', icon: 'none' })
      return
    }
    
    // 如果没有 userId，使用 nickName 作为 userId 参数（用户主页会根据 userId 或 nickName 查询）
    let targetUserId = userId || nickName
    let url = `/pages/userProfile/userProfile?userId=${encodeURIComponent(targetUserId)}`
    
    if (nickName) {
      url += `&nickName=${encodeURIComponent(nickName)}`
    }
    if (avatarUrl) {
      url += `&avatarUrl=${encodeURIComponent(avatarUrl)}`
    }
    
    wx.navigateTo({ url: url })
  },
  
  // 清理鸽子测试数据（管理员专用）
  clearTestDoves: function() {
    if (!this.data.isAdmin) {
      wx.showToast({ title: '只有管理员可以操作', icon: 'none' })
      return
    }
    
    const that = this
    
    wx.showModal({
      title: '清理测试数据',
      content: '确定要清空所有鸽子记录吗？此操作不可恢复！',
      confirmColor: '#dc2626',
      success: function(res) {
        if (res.confirm) {
          wx.showLoading({ title: '清理中...' })
          
          db.collection('doves').get({
            success: function(res) {
              const records = res.data || []
              let deletedCount = 0
              
              if (records.length === 0) {
                wx.hideLoading()
                wx.showToast({ title: '没有数据可清理', icon: 'none' })
                return
              }
              
              records.forEach(record => {
                db.collection('doves').doc(record._id).remove({
                  success: function() {
                    deletedCount++
                    if (deletedCount === records.length) {
                      wx.hideLoading()
                      wx.showToast({ title: `已清理 ${deletedCount} 条记录`, icon: 'success' })
                      // 刷新鸽子榜
                      that.loadDoveRankings()
                    }
                  },
                  fail: function() {
                    deletedCount++
                    if (deletedCount === records.length) {
                      wx.hideLoading()
                      wx.showToast({ title: '清理完成', icon: 'success' })
                      that.loadDoveRankings()
                    }
                  }
                })
              })
            },
            fail: function() {
              wx.hideLoading()
              wx.showToast({ title: '清理失败', icon: 'none' })
            }
          })
        }
      }
    })
  },

  // 初始化 doves 集合（使用云函数）
  initDovesCollection: function() {
    // 先尝试查询 doves 集合
    db.collection('doves').limit(1).get({
      success: function(res) {
        // console.log('doves 集合已存在')
      },
      fail: function(err) {
        // 如果集合不存在，调用云函数创建
        if (err.errCode === -502005) {
          // console.log('doves 集合不存在，调用云函数创建...')
          wx.cloud.callFunction({
            name: 'initDovesCollection',
            success: function(res) {
              // console.log('云函数返回:', res)
              if (res.result && res.result.success) {
                // console.log('doves 集合创建成功')
              } else {
                // console.error('云函数创建集合失败:', res)
              }
            },
            fail: function(createErr) {
              // console.error('调用云函数失败:', createErr)
            }
          })
        }
      }
    })
  },

  goToSignup: function() {
    wx.switchTab({
      url: '/pages/signup/signup'
    })
  },

  goToDetail: function(e) {
    const activity = e.currentTarget.dataset.activity
    const activityId = activity.id || activity._id
    let url = `/pages/detail/detail?id=${activityId}&title=${encodeURIComponent(activity.title)}`
    if (activity._id) {
      url += `&_id=${encodeURIComponent(activity._id)}`
    }
    wx.navigateTo({
      url: url
    })
  }
})