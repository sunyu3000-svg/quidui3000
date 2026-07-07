const db = wx.cloud.database()

Page({
  data: {
    userId: '',
    userInfo: {
      nickName: '',
      avatarUrl: '',
      wechatName: '',
      registerTime: '',
      position: '',
      jerseyNumber: '',
      phone: ''
    },
    myInfo: {},
    isAdmin: false,
    myImpression: '',
    stats: {
      joinCount: 0,
      commonCount: 0
    },
    likeCount: 0,
    likedByCount: 0,
    visitorCount: 0,
    doveCount: 0,
    remarkName: '',
    commonActivities: {
      thisYear: 0,
      total: 0
    },
    impressions: [],
    selectedImpressions: [],
    selectedMap: {},
    customImpression: '',
    showImpressionModal: false,
    impressionOptions: [
      '高颜值射手',
      '快枪手',
      '后防中坚',
      '边路快手',
      '中场发动机',
      '任意球大师',
      '门神',
      '跑不死',
      '助攻王',
      '带刀后卫',
      '传球大师',
      '终结者',
      '盘带高手',
      '战术大师',
      '团队领袖',
      '防守铁闸',
      '速度之星',
      '技术流',
      '大心脏',
      '领袖气质',
      '绿茵艺术家'
    ]
  },

  onLoad: function(options) {
    if (options.userId) {
      this.setData({ userId: options.userId })
      
      if (options.nickName) {
        const avatarUrl = options.avatarUrl ? decodeURIComponent(options.avatarUrl) : ''
        this.setData({
          userInfo: {
            nickName: decodeURIComponent(options.nickName) || '默认昵称',
            avatarUrl: avatarUrl,
            wechatName: decodeURIComponent(options.nickName) || '默认昵称',
            registerTime: '',
            position: '',
            jerseyNumber: '',
            phone: ''
          }
        })
      } else {
        this.setData({
          userInfo: {
            nickName: '未知用户',
            avatarUrl: '',
            wechatName: '默认昵称',
            registerTime: '',
            position: '',
            jerseyNumber: '',
            phone: ''
          }
        })
      }
      
      this.loadMyInfo()
    } else {
      wx.showToast({
        title: '用户ID无效',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  loadMyInfo: function() {
    const that = this
    wx.cloud.callFunction({
      name: 'getOpenId',
      success: function(res) {
        const openId = res.result.openid
        db.collection('users').doc(openId).get({
          success: function(res) {
            that.setData({ myInfo: { ...res.data, openId: openId } })
            that.checkAdmin()
            that.loadUserInfo()
          },
          fail: function(err) {
            that.setData({ myInfo: { openId: openId, nickName: '用户' } })
            that.checkAdmin()
            that.loadUserInfo()
          }
        })
      },
      fail: function(err) {
        wx.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        })
        that.setData({ myInfo: { openId: '', nickName: '用户' } })
        that.checkAdmin()
        that.loadUserInfo()
      }
    })
  },

  loadUserInfo: function(callback) {
    const that = this
    const { userId, userInfo } = this.data

    db.collection('users').doc(userId).get({
      success: function(res) {
        const userData = res.data
        const newUserId = userData._id || userId
        let avatarUrl = (userData.avatarUrl && userData.avatarUrl.trim()) || (userInfo && userInfo.avatarUrl) || ''
        
        // 如果查到的记录缺少关键字段，尝试按 nickName 查最新记录
        const hasKeyData = userData.phone || userData.position || userData.jerseyNumber || userData.avatarUrl
        if (!hasKeyData && userData.nickName) {
          that.loadUserInfoByNickName(userData.nickName, callback)
          return
        }
        
        // 如果users集合里没有头像，尝试从signups获取
        if (!avatarUrl && userData.nickName) {
          that.fetchAvatarFromSignups(userData.nickName, function(fetchedAvatar) {
            avatarUrl = fetchedAvatar || avatarUrl
                that.setData({
                  userId: newUserId,
                  userInfo: {
                    nickName: userData.nickName || (userInfo && userInfo.nickName) || '默认昵称',
                    avatarUrl: avatarUrl,
                    wechatName: userData.wechatName || (userInfo && userInfo.nickName) || '默认昵称',
                    registerTime: userData.registerTime || '',
                    position: userData.position || '',
                    jerseyNumber: userData.jerseyNumber || '',
                    phone: userData.phone || ''
                  }
                })
            that.loadRemarkName()
            that.loadAllStats(newUserId)
            if (callback) callback()
          })
          return
        }
        
        that.setData({
          userId: newUserId,
          userInfo: {
            nickName: userData.nickName || (userInfo && userInfo.nickName) || '默认昵称',
            avatarUrl: avatarUrl,
            wechatName: userData.wechatName || (userInfo && userInfo.nickName) || '默认昵称',
            registerTime: userData.registerTime || '',
            position: userData.position || '',
            jerseyNumber: userData.jerseyNumber || '',
            phone: userData.phone || ''
          }
        })
        that.loadRemarkName()
        that.loadAllStats(newUserId)
        if (callback) callback()
      },
      fail: function() {
        that.loadUserInfoByNickName(userId, callback)
      }
    })
  },

  // 从signups集合获取头像（查多条记录，取第一条有头像的）
  fetchAvatarFromSignups: function(nickName, callback) {
    const that = this
    if (!nickName) {
      if (callback) callback('')
      return
    }
    
    // 先查signups集合，不限1条，取最近有头像的记录
    db.collection('signups').where({
      nickName: nickName
    }).orderBy('signupTime', 'desc').get({
      success: function(res) {
        const records = res.data || []
        // 找第一条有头像的记录
        const recordWithAvatar = records.find(r => r.avatarUrl || r.avatar)
        if (recordWithAvatar) {
          if (callback) callback(recordWithAvatar.avatarUrl || recordWithAvatar.avatar)
          return
        }
        
        // signups里没有头像，尝试从users集合查（先按nickName，再按userId/openId）
        db.collection('users').where({
          nickName: nickName
        }).get({
          success: function(userRes) {
            const users = userRes.data || []
            const userWithAvatar = users.find(u => u.avatarUrl || u.avatar)
            if (userWithAvatar) {
              if (callback) callback(userWithAvatar.avatarUrl || userWithAvatar.avatar)
              return
            }
            
            // 按nickName查不到，尝试从signups记录获取userId，然后查users的openId字段
            const recordWithUserId = records.find(r => r.userId || r._openid)
            if (recordWithUserId) {
              const userId = recordWithUserId.userId || recordWithUserId._openid
              db.collection('users').where({
                openId: userId
              }).get({
                success: function(userRes) {
                  if (userRes.data.length > 0 && (userRes.data[0].avatarUrl || userRes.data[0].avatar)) {
                    if (callback) callback(userRes.data[0].avatarUrl || userRes.data[0].avatar)
                  } else {
                    if (callback) callback('')
                  }
                },
                fail: function() {
                  if (callback) callback('')
                }
              })
            } else {
              if (callback) callback('')
            }
          },
          fail: function() {
            if (callback) callback('')
          }
        })
      },
      fail: function() {
        // signups查询失败，直接查users
        db.collection('users').where({
          nickName: nickName
        }).get({
          success: function(userRes) {
            const users = userRes.data || []
            const userWithAvatar = users.find(u => u.avatarUrl || u.avatar)
            if (userWithAvatar) {
              if (callback) callback(userWithAvatar.avatarUrl || userWithAvatar.avatar)
            } else {
              if (callback) callback('')
            }
          },
          fail: function() {
            if (callback) callback('')
          }
        })
      }
    })
  },

  loadUserInfoByNickName: function(nickName, callback) {
    const that = this
    const { userInfo } = this.data

    db.collection('users').where({
      nickName: nickName
    }).get({
      success: function(res) {
        if (res.data.length > 0) {
          // 如果有多条记录，取 updateTime 最新的
          const records = res.data
          const latestRecord = records.length > 1
            ? records.sort((a, b) => {
                const timeA = a.updateTime ? new Date(a.updateTime) : new Date(0)
                const timeB = b.updateTime ? new Date(b.updateTime) : new Date(0)
                return timeB - timeA
              })[0]
            : records[0]
          
          const userData = latestRecord
          const newUserId = userData._id || nickName
          let avatarUrl = (userData.avatarUrl && userData.avatarUrl.trim()) || (userInfo && userInfo.avatarUrl) || ''
          
          // 如果users集合里没有头像，尝试从signups获取
          if (!avatarUrl && userData.nickName) {
            that.fetchAvatarFromSignups(userData.nickName, function(fetchedAvatar) {
              avatarUrl = fetchedAvatar || avatarUrl
              that.setData({
                userId: newUserId,
                userInfo: {
                  nickName: userData.nickName || (userInfo && userInfo.nickName) || '默认昵称',
                  avatarUrl: avatarUrl,
                  wechatName: userData.wechatName || (userInfo && userInfo.nickName) || '默认昵称',
                  registerTime: userData.registerTime || '',
                  position: userData.position || '',
                  jerseyNumber: userData.jerseyNumber || '',
                  phone: userData.phone || ''
                }
              })
              that.loadRemarkName()
              that.loadAllStats(newUserId)
              if (callback) callback()
            })
            return
          }
          
          that.setData({
            userId: newUserId,
            userInfo: {
              nickName: userData.nickName || (userInfo && userInfo.nickName) || '默认昵称',
              avatarUrl: avatarUrl,
              wechatName: userData.wechatName || (userInfo && userInfo.nickName) || '默认昵称',
              registerTime: userData.registerTime || '',
              position: userData.position || '',
              jerseyNumber: userData.jerseyNumber || '',
              phone: userData.phone || ''
            }
          })
          that.loadRemarkName()
          that.loadAllStats(newUserId)
        } else {
          // users集合中没有匹配nickName的记录，尝试从signups获取头像
          that.fetchAvatarFromSignups(nickName, function(fetchedAvatar) {
            if (fetchedAvatar) {
              that.setData({
                'userInfo.avatarUrl': fetchedAvatar
              })
            }
            if (!userInfo || !userInfo.nickName || userInfo.nickName === '未知用户') {
              that.setData({
                userInfo: {
                  nickName: '未知用户',
                  avatarUrl: fetchedAvatar || '',
                  wechatName: '默认昵称',
                  registerTime: '',
                  position: '',
                  jerseyNumber: '',
                  phone: ''
                }
              })
            }
            that.loadRemarkName()
            that.loadAllStats(nickName)
          })
          return
        }
        if (callback) callback()
      },
      fail: function(err) {
        that.loadUserInfoFromSignups(nickName, callback)
      }
    })
  },

  loadUserInfoFromSignups: function(nickName, callback) {
    const that = this
    const { userInfo } = this.data

    db.collection('signups').where({
      nickName: nickName
    }).limit(1).get({
      success: function(res) {
        let newUserId = nickName
        if (res.data.length > 0) {
          const signupData = res.data[0]
          newUserId = signupData.userId || signupData._openid || nickName
          let avatarUrl = (signupData.avatarUrl && signupData.avatarUrl.trim()) || (userInfo && userInfo.avatarUrl) || ''
          
          // 如果signups记录里没有头像，再查一次最新的signups
          if (!avatarUrl && signupData.nickName) {
            that.fetchAvatarFromSignups(signupData.nickName, function(fetchedAvatar) {
              avatarUrl = fetchedAvatar || avatarUrl
              that.setData({
                userId: newUserId,
                userInfo: {
                  nickName: signupData.nickName || (userInfo && userInfo.nickName) || '默认昵称',
                  avatarUrl: avatarUrl,
                  wechatName: signupData.nickName || (userInfo && userInfo.nickName) || '默认昵称',
                  registerTime: '',
                  position: '',
                  jerseyNumber: '',
                  phone: ''
                }
              })
              that.loadRemarkName()
              that.loadAllStats(newUserId)
              if (callback) callback()
            })
            return
          }
          
          that.setData({
            userId: newUserId,
            userInfo: {
              nickName: signupData.nickName || (userInfo && userInfo.nickName) || '默认昵称',
              avatarUrl: avatarUrl,
              wechatName: signupData.nickName || (userInfo && userInfo.nickName) || '默认昵称',
              registerTime: '',
              position: '',
              jerseyNumber: '',
              phone: ''
            }
          })
        } else {
          if (!userInfo || !userInfo.nickName || userInfo.nickName === '未知用户') {
            that.setData({
              userInfo: {
                nickName: '未知用户',
                avatarUrl: '',
                wechatName: '默认昵称',
                registerTime: '',
                position: '',
                jerseyNumber: '',
                phone: ''
              }
            })
          }
        }
        that.loadRemarkName()
        that.loadAllStats(newUserId)
        if (callback) callback()
      },
      fail: function(err) {
        if (!userInfo || !userInfo.nickName || userInfo.nickName === '未知用户') {
          that.setData({
            userInfo: {
              nickName: '未知用户',
              avatarUrl: '',
              wechatName: '默认昵称',
              registerTime: '',
              position: '',
              jerseyNumber: '',
              phone: ''
            }
          })
        }
        that.loadRemarkName()
        that.loadAllStats(nickName)
        if (callback) callback()
      }
    })
  },

  loadRemarkName: function() {
    const that = this
    const { myInfo, userId } = this.data
    if (!myInfo || !myInfo.openId) return

    db.collection('remarks').where({
      fromOpenId: myInfo.openId,
      toUserId: userId
    }).get({
      success: function(res) {
        if (res.data.length > 0) {
          that.setData({ remarkName: res.data[0].remarkName })
        }
      }
    })
  },

  loadAllStats: function(targetUserId) {
    const that = this
    const userId = targetUserId || that.data.userId
    that.checkLikeStatus(userId)
    that.loadStats(userId)
    that.loadDoveCount(userId)
    that.recordVisit(userId)
    that.loadImpressions(userId)
  },

  checkLikeStatus: function(targetUserId) {
    const that = this
    const { myInfo, userInfo } = this.data
    const userId = targetUserId || that.data.userId
    
    if (!myInfo || !myInfo.openId) return

    const targetNickName = userInfo ? userInfo.nickName : ''

    db.collection('likes').where({
      fromOpenId: myInfo.openId
    }).where(db.command.or([
      { toUserId: userId },
      { toNickName: userId },
      { toNickName: targetNickName }
    ])).get({
      success: function(res) {
        that.setData({ isLiked: res.data.length > 0 })
      },
      fail: function() {
        that.setData({ isLiked: false })
      }
    })

    db.collection('likes').where({
      fromOpenId: myInfo.openId
    }).count({
      success: function(res) {
        that.setData({ likeCount: res.total })
      },
      fail: function() {
        that.setData({ likeCount: 0 })
      }
    })

    db.collection('likes').where(db.command.or([
      { toUserId: userId },
      { toNickName: userId },
      { toNickName: targetNickName }
    ])).count({
      success: function(res) {
        that.setData({ likedByCount: res.total })
      },
      fail: function() {
        that.setData({ likedByCount: 0 })
      }
    })
  },

  loadStats: function(targetUserId) {
    const that = this
    const { myInfo, userInfo } = this.data
    const userId = targetUserId || that.data.userId
    if (!myInfo || (!myInfo.openId && !myInfo.userId)) return

    const myUserId = myInfo.userId || myInfo.openId

    const nickName = userInfo ? userInfo.nickName : ''
    db.collection('signups').where(db.command.or([
      { userId: userId },
      { nickName: userId },
      { nickName: nickName }
    ])).where({
      status: 'signups'
    }).count({
      success: function(res) {
        that.setData({
          'stats.joinCount': res.total
        })
      },
      fail: function(err) {
        that.setData({
          'stats.joinCount': 0
        })
      }
    })

    db.collection('signups').where({
      userId: myUserId,
      status: 'signups'
    }).get({
      success: function(myRes) {
        const myActivityIds = myRes.data.map(item => item.activityId)

        db.collection('signups').where(db.command.or([
          { userId: userId },
          { nickName: userId },
          { nickName: nickName }
        ])).where({
          status: 'signups'
        }).get({
          success: function(userRes) {
            const commonCount = userRes.data.filter(item => 
              myActivityIds.includes(item.activityId)
            ).length

            that.setData({
              'stats.commonCount': commonCount,
              'commonActivities.thisYear': commonCount,
              'commonActivities.total': commonCount
            })
          },
          fail: function(err) {
            that.setData({
              'stats.commonCount': 0
            })
          }
        })
      },
      fail: function() {
        that.setData({
          'stats.commonCount': 0
        })
      }
    })
  },

  loadDoveCount: function(targetUserId) {
    const that = this
    const { userInfo } = this.data
    const userId = targetUserId || that.data.userId

    const nickName = userInfo ? userInfo.nickName : ''
    db.collection('doves').where(db.command.or([
      { userId: userId },
      { nickName: userId },
      { nickName: nickName }
    ])).count({
      success: function(res) {
        that.setData({ doveCount: res.total })
      },
      fail: function() {
        that.setData({ doveCount: 0 })
      }
    })
  },

  recordVisit: function(targetUserId) {
    // 访客功能已关闭，直接清零
    this.setData({ visitorCount: 0 })
  },

  toggleLike: function() {
    const that = this
    const { userId, myInfo, isLiked, userInfo } = this.data
    if (!myInfo || !myInfo.openId) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    const targetNickName = userInfo ? userInfo.nickName : ''

    if (isLiked) {
      db.collection('likes').where({
        fromOpenId: myInfo.openId
      }).where(db.command.or([
        { toUserId: userId },
        { toNickName: userId },
        { toNickName: targetNickName }
      ])).get({
        success: function(res) {
          if (res.data.length > 0) {
            db.collection('likes').doc(res.data[0]._id).remove({
              success: function() {
                that.setData({ isLiked: false })
                that.checkLikeStatus()
              }
            })
          }
        }
      })
    } else {
      db.collection('likes').add({
        data: {
          fromOpenId: myInfo.openId,
          fromNickName: myInfo.nickName || '',
          toUserId: userId,
          toNickName: targetNickName,
          createTime: new Date()
        },
        success: function() {
          that.setData({ isLiked: true })
          that.checkLikeStatus()
        }
      })
    }
  },

  setRemark: function() {
    const that = this
    const { userId, myInfo, remarkName, userInfo } = this.data
    if (!myInfo || !myInfo.openId) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    const targetNickName = userInfo ? userInfo.nickName : ''

    wx.showModal({
      title: '设置备注名',
      editable: true,
      placeholderText: '输入备注名',
      content: remarkName || '',
      success: function(res) {
        if (res.confirm && res.content) {
          db.collection('remarks').where({
            fromOpenId: myInfo.openId
          }).where(db.command.or([
            { toUserId: userId },
            { toNickName: userId },
            { toNickName: targetNickName }
          ])).get({
            success: function(result) {
              if (result.data.length > 0) {
                db.collection('remarks').doc(result.data[0]._id).update({
                  data: { remarkName: res.content }
                })
              } else {
                db.collection('remarks').add({
                  data: {
                    fromOpenId: myInfo.openId,
                    toUserId: userId,
                    toNickName: targetNickName,
                    remarkName: res.content
                  }
                })
              }
              that.setData({ remarkName: res.content })
            }
          })
        }
      }
    })
  },

  showImpressionModal: function() {
    this.setData({ showImpressionModal: true })
  },

  closeImpressionModal: function() {
    this.setData({ 
      showImpressionModal: false,
      selectedImpressions: [],
      selectedMap: {},
      customImpression: ''
    })
  },

  stopPropagation: function() {
  },

  selectImpression: function(e) {
    const content = e.currentTarget.dataset.content
    const { selectedImpressions, selectedMap } = this.data
    const newSelectedMap = { ...selectedMap }
    let newSelectedImpressions

    if (newSelectedMap[content]) {
      delete newSelectedMap[content]
      newSelectedImpressions = selectedImpressions.filter(item => item !== content)
    } else {
      if (selectedImpressions.length >= 3) {
        wx.showToast({ title: '最多选择3个', icon: 'none' })
        return
      }
      newSelectedMap[content] = true
      newSelectedImpressions = [...selectedImpressions, content]
    }

    this.setData({
      selectedImpressions: newSelectedImpressions,
      selectedMap: newSelectedMap
    })
  },

  onImpressionInput: function(e) {
    this.setData({ customImpression: e.detail.value })
  },

  saveImpression: function() {
    const that = this
    const { userId, myInfo, selectedImpressions, customImpression, userInfo } = this.data
    if (!myInfo || !myInfo.openId) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    const finalImpression = selectedImpressions.length > 0 
      ? selectedImpressions.join('、') 
      : customImpression

    if (!finalImpression || !finalImpression.trim()) {
      wx.showToast({ title: '请输入印象', icon: 'none' })
      return
    }

    const targetNickName = userInfo ? userInfo.nickName : ''

    db.collection('impressions').where({
      fromOpenId: myInfo.openId
    }).where(db.command.or([
      { toUserId: userId },
      { toNickName: userId },
      { toNickName: targetNickName }
    ])).get({
      success: function(res) {
        if (res.data.length > 0) {
          db.collection('impressions').doc(res.data[0]._id).update({
            data: { 
              content: finalImpression,
              updateTime: new Date()
            },
            success: function() {
              that.closeImpressionModal()
              that.loadImpressions()
            }
          })
        } else {
          that.saveImpressionData(myInfo, userId, targetNickName, finalImpression)
        }
      },
      fail: function() {
        that.saveImpressionData(myInfo, userId, targetNickName, finalImpression)
      }
    })
  },

  saveImpressionData: function(myInfo, userId, toNickName, finalImpression) {
    const that = this
    db.collection('impressions').add({
      data: {
        fromOpenId: myInfo.openId,
        fromNickName: myInfo.nickName || '',
        toUserId: userId,
        toNickName: toNickName || '',
        content: finalImpression,
        createTime: new Date(),
        updateTime: new Date()
      },
      success: function() {
        that.closeImpressionModal()
        that.loadImpressions()
      },
      fail: function() {
        db.collection('impressions').add({
          data: {
            fromOpenId: myInfo.openId,
            fromNickName: myInfo.nickName || '',
            toUserId: userId,
            toNickName: toNickName || '',
            content: finalImpression,
            createTime: new Date(),
            updateTime: new Date()
          },
          success: function() {
            that.closeImpressionModal()
            that.loadImpressions()
          },
          fail: function() {
            that.initCollectionsAndSave(myInfo, userId, toNickName, finalImpression)
          }
        })
      }
    })
  },

  initCollectionsAndSave: function(myInfo, userId, toNickName, finalImpression) {
    const that = this
    wx.cloud.callFunction({
      name: 'initAdmin',
      success: function() {
        that.saveImpressionData(myInfo, userId, toNickName, finalImpression)
      },
      fail: function() {
        wx.showToast({ title: '保存失败，请稍后重试', icon: 'none' })
        that.closeImpressionModal()
      }
    })
  },

  loadImpressions: function(targetUserId) {
    const that = this
    const { myInfo, userInfo } = this.data
    const userId = targetUserId || that.data.userId

    const targetNickName = userInfo ? userInfo.nickName : ''

    // 如果没有任何用户标识，直接清空印象数据，避免查全表
    if (!userId && !targetNickName) {
      that.setData({ impressions: [], myImpression: '', selectedImpressions: [], selectedMap: {}, customImpression: '' })
      return
    }

    const conditions = []
    if (userId) {
      conditions.push({ toUserId: userId })
      conditions.push({ toNickName: userId })
    }
    if (targetNickName) {
      conditions.push({ toNickName: targetNickName })
    }

    db.collection('impressions').where(db.command.or(conditions)).get({
      success: function(res) {
        const impressions = (res.data || []).map(item => ({
          ...item,
          formattedTime: item.createTime ? new Date(item.createTime).toLocaleString() : ''
        })).sort((a, b) => new Date(b.createTime) - new Date(a.createTime))

        that.setData({ impressions: impressions })

        if (myInfo && myInfo.openId) {
          const myImpressionItem = impressions.find(i => i.fromOpenId === myInfo.openId)
          if (myImpressionItem && myImpressionItem.content) {
            const selectedArray = myImpressionItem.content.split('、').filter(item => item.trim())
            const selectedMap = {}
            selectedArray.forEach(item => {
              selectedMap[item] = true
            })
            that.setData({ 
              myImpression: myImpressionItem.content,
              selectedImpressions: selectedArray,
              selectedMap: selectedMap,
              customImpression: ''
            })
          } else {
            that.setData({
              myImpression: '',
              selectedImpressions: [],
              selectedMap: {},
              customImpression: ''
            })
          }
        }
      },
      fail: function() {
        that.setData({ impressions: [] })
      }
    })
  },

  deleteImpression: function(e) {
    const that = this
    const id = e.currentTarget.dataset.id

    db.collection('impressions').doc(id).remove({
      success: function() {
        that.loadImpressions()
      },
      fail: function() {
        wx.showToast({ title: '删除失败', icon: 'none' })
      }
    })
  },

  checkAdmin: function() {
    const that = this
    const { myInfo } = this.data
    if (!myInfo || !myInfo.openId) {
      this.setData({ isAdmin: false })
      return
    }
    db.collection('admins').where({ openId: myInfo.openId }).get({
      success: function(res) {
        that.setData({ isAdmin: res.data.length > 0 })
      },
      fail: function() {
        that.setData({ isAdmin: false })
      }
    })
  }
})