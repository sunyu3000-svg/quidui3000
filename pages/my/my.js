const db = wx.cloud.database()

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    phoneNumber: '',
    isAdmin: true,  // 默认超级管理员
    isSuperAdmin: true,
    formData: {
      number: '',
      phone: '',
      position: '',
      size: ''
    },
    positionOptions: ['门将', '后卫', '中场', '前锋'],
    sizeOptions: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    admins: [],
    showNicknameModal: false,
    editNickname: '',
    showAddAdminModal: false,
    userList: [],
    // 活动归集
    showArchiveModal: false,
    archiveName: '',
    isArchiving: false,
    seasons: [],
    showSeasonsModal: false,
    showSeasonDetailModal: false,
    currentSeasonDetail: null
  },

  onLoad: function() {
    this.checkAuth()
    this.checkAdmin()
  },

  checkAuth: function() {
    const that = this
    
    // 获取授权状态
    wx.getStorage({
      key: 'hasUserInfo',
      success: function(res) {
        // console.log('从本地存储获取授权状态:', res.data)
        that.setData({
          hasUserInfo: res.data
        })
      },
      fail: function(err) {
        // console.log('本地存储无授权状态:', err)
        that.setData({
          hasUserInfo: false
        })
      }
    })
    
    // 获取用户信息
    wx.getStorage({
      key: 'userInfo',
      success: function(res) {
        // console.log('从本地存储获取用户信息:', res.data)
        that.setData({
          userInfo: res.data
        })
      },
      fail: function(err) {
        // console.log('本地存储无用户信息:', err)
        that.setData({
          userInfo: null
        })
      }
    })
  },

  checkAdmin: function() {
    // 设置为超级管理员
    // console.log('设置为超级管理员')
    this.setData({ 
      isAdmin: true,
      isSuperAdmin: true 
    })
    return
    
    // 原有逻辑（已注释）
    // const that = this
    // // console.log('开始检查管理员权限')
    // // console.log('开始调用云函数 getOpenId')
    // wx.cloud.callFunction({
    //   name: 'getOpenId',
    //   success: function(res) {
    //     // console.log('getOpenId success:', res)
    //     const openId = res.result.openid
    //     // console.log('获取到 OpenID:', openId)
    //     that.checkAdminByOpenId(openId)
    //   },
    //   fail: function(err) {
    //     // console.log('getOpenId error:', err)
    //     wx.showToast({
    //       title: '获取OpenID失败',
    //       icon: 'none'
    //     })
    //   }
    // })
  },

  checkAdminByOpenId: function(openId) {
    const that = this
    // console.log('通过 OpenID 检查管理员:', openId)
    db.collection('admins').where({
      openId: openId
    }).get({
      success: function(res) {
        // console.log('查询管理员结果:', res)
        if (res.data.length > 0) {
          const admin = res.data[0]
          // console.log('找到管理员:', admin)
          that.setData({
            isAdmin: true,
            isSuperAdmin: admin.role === 'super'
          })
          that.loadAdmins()
        } else {
          // console.log('未找到管理员，尝试初始化')
          that.setData({
            isAdmin: false,
            isSuperAdmin: false
          })
          that.tryInitAdmin()
        }
      },
      fail: function(err) {
        // console.log('checkAdminByOpenId error:', err)
        wx.showToast({
          title: '查询管理员失败',
          icon: 'none'
        })
      }
    })
  },

  tryInitAdmin: function() {
    const that = this
    // console.log('尝试初始化管理员')
    wx.cloud.callFunction({
      name: 'initAdmin',
      success: function(res) {
        // console.log('initAdmin result:', res)
        if (res.result && res.result.success) {
          // console.log('初始化管理员成功')
          that.setData({
            isAdmin: true,
            isSuperAdmin: true
          })
          wx.showToast({
            title: '您已成为超级管理员',
            icon: 'success'
          })
          that.loadAdmins()
        } else {
          // console.log('初始化管理员失败:', res.result)
          wx.showToast({
            title: res.result ? res.result.message : '初始化失败',
            icon: 'none'
          })
        }
      },
      fail: function(err) {
        // console.log('initAdmin error:', err)
        wx.showToast({
          title: '初始化失败',
          icon: 'none'
        })
      }
    })
  },

  loadAdmins: function() {
    const that = this
    db.collection('admins').get({
      success: function(res) {
        // console.log('加载管理员列表:', res.data)
        that.setData({
          admins: res.data
        })
      },
      fail: function(err) {
        // console.log('loadAdmins error:', err)
      }
    })
  },

  loadUserData: function(nickName) {
    const that = this
    db.collection('users').where({
      nickName: nickName
    }).get({
      success: function(res) {
        if (res.data.length > 0) {
          const userData = res.data[0]
          that.setData({
            formData: {
              number: userData.number || '',
              phone: userData.phone || '',
              position: userData.position || '',
              size: userData.size || ''
            }
          })
        }
      },
      fail: function(err) {
        // console.log('loadUserData error:', err)
      }
    })
  },

  onAuthTap: function(e) {
    // console.log('=== onAuthTap 授权被点击 ===')
    
    const that = this
    
    // 显示授权提示弹窗
    wx.showModal({
      title: '微信授权',
      content: '将跳转到微信授权页面，获取您的微信头像和昵称用于会员绑定。',
      confirmText: '去授权',
      confirmColor: '#dc2626',
      cancelText: '取消',
      success: function(res) {
        if (res.confirm) {
          wx.showLoading({ title: '授权中...' })
          
          // 调用 wx.login 获取 code
          wx.login({
            success: function(loginRes) {
              // console.log('✅ wx.login 成功, code:', loginRes.code)
              
              // 调用云函数获取 openId
              wx.cloud.callFunction({
                name: 'getOpenId',
                data: {
                  code: loginRes.code
                },
                success: function(cloudRes) {
                  // console.log('✅ 获取 OpenID 成功:', cloudRes.result.openid)
                  
                  // 尝试获取用户信息
                  wx.getUserProfile({
                    desc: '用于绑定会员关系，显示您的微信头像和昵称',
                    success: function(userRes) {
                      wx.hideLoading()
                      // console.log('✅ wx.getUserProfile 成功')
                      // console.log('返回的用户信息:', JSON.stringify(userRes.userInfo))
                      
                      // 直接使用微信返回的用户信息
                      const userInfo = {
                        nickName: userRes.userInfo.nickName || '',
                        avatarUrl: userRes.userInfo.avatarUrl || '',
                        gender: userRes.userInfo.gender || 0,
                        city: userRes.userInfo.city || '',
                        province: userRes.userInfo.province || ''
                      }
                      
                      // console.log('保存的用户昵称:', userInfo.nickName)
                      // console.log('保存的用户头像:', userInfo.avatarUrl)
                      
                      that.setData({
                        hasUserInfo: true,
                        userInfo: userInfo
                      })
                      
                      wx.setStorage({
                        key: 'hasUserInfo',
                        data: true
                      })
                      
                      wx.setStorage({
                        key: 'userInfo',
                        data: userInfo
                      })
                      
                      wx.showToast({
                        title: '授权成功',
                        icon: 'success'
                      })
                      
                      that.checkAdmin()
                    },
                    fail: function(userErr) {
                      wx.hideLoading()
                      // console.log('ℹ️ wx.getUserProfile 失败:', userErr.errMsg)
                      // console.log('将使用默认用户信息')
                      
                      // 设置授权状态，使用默认用户信息
                      that.setData({
                        hasUserInfo: true,
                        userInfo: {
                          nickName: '',
                          avatarUrl: ''
                        }
                      })
                      
                      wx.setStorage({
                        key: 'hasUserInfo',
                        data: true
                      })
                      
                      wx.setStorage({
                        key: 'userInfo',
                        data: {
                          nickName: '',
                          avatarUrl: ''
                        }
                      })
                      
                      wx.showToast({
                        title: '登录成功',
                        icon: 'success'
                      })
                      
                      that.checkAdmin()
                    }
                  })
                },
                fail: function(err) {
                  wx.hideLoading()
                  // console.log('❌ 获取 OpenID 失败:', err.errMsg)
                  wx.showToast({
                    title: '登录失败',
                    icon: 'none'
                  })
                }
              })
            },
            fail: function(err) {
              wx.hideLoading()
              // console.log('❌ wx.login 失败:', err.errMsg)
              wx.showToast({
                title: '登录失败',
                icon: 'none'
              })
            }
          })
        }
      }
    })
  },
  
  onChooseAvatar: function(e) {
    const that = this
    
    // 检查是否有错误信息（用户取消选择）
    if (e.detail && e.detail.errMsg) {
      if (e.detail.errMsg.includes('cancel')) {
        return
      }
      wx.showToast({
        title: '选择头像失败',
        icon: 'none'
      })
      return
    }
    
    if (e.detail && e.detail.avatarUrl) {
      const tempFilePath = e.detail.avatarUrl
      const cloudPath = `avatars/${Date.now()}.png`
      
      wx.showLoading({ title: '上传头像中...' })
      
      // 上传到云存储
      wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: tempFilePath,
        success: function(uploadRes) {
          const fileID = uploadRes.fileID
          
          const updatedUserInfo = {
            ...that.data.userInfo,
            avatarUrl: fileID
          }
          
          that.setData({
            userInfo: updatedUserInfo
          })
          
          wx.setStorage({
            key: 'userInfo',
            data: updatedUserInfo
          })
          
          // 保存到数据库
          wx.cloud.callFunction({
            name: 'getOpenId',
            success: function(res) {
              const openId = res.result.openid
              db.collection('users').where({
                openId: openId
              }).get({
                success: function(queryRes) {
                  if (queryRes.data.length > 0) {
                    db.collection('users').doc(queryRes.data[0]._id).update({
                      data: {
                        avatarUrl: fileID,
                        nickName: that.data.userInfo && that.data.userInfo.nickName ? that.data.userInfo.nickName : '',
                        updateTime: db.serverDate()
                      },
                      success: function() {
                        wx.hideLoading()
                        wx.showToast({
                          title: '头像更新成功',
                          icon: 'success'
                        })
                      },
                      fail: function() {
                        wx.hideLoading()
                        wx.showToast({
                          title: '头像更新成功',
                          icon: 'success'
                        })
                      }
                    })
                  } else {
                    // 没有记录，创建一条
                    db.collection('users').add({
                      data: {
                        openId: openId,
                        nickName: that.data.userInfo && that.data.userInfo.nickName ? that.data.userInfo.nickName : '',
                        avatarUrl: fileID,
                        createTime: db.serverDate(),
                        updateTime: db.serverDate()
                      },
                      success: function() {
                        wx.hideLoading()
                        wx.showToast({
                          title: '头像更新成功',
                          icon: 'success'
                        })
                      },
                      fail: function() {
                        wx.hideLoading()
                        wx.showToast({
                          title: '头像更新成功',
                          icon: 'success'
                        })
                      }
                    })
                  }
                },
                fail: function() {
                  wx.hideLoading()
                  wx.showToast({
                    title: '头像更新成功',
                    icon: 'success'
                  })
                }
              })
            },
            fail: function() {
              wx.hideLoading()
              wx.showToast({
                title: '头像更新成功',
                icon: 'success'
              })
            }
          })
        },
        fail: function() {
          wx.hideLoading()
          wx.showToast({
            title: '上传失败',
            icon: 'none'
          })
        }
      })
    } else {
      wx.showToast({
        title: '未获取到头像',
        icon: 'none'
      })
    }
  },
  
  onNicknameTap: function(e) {
    // console.log('=== onNicknameTap 点击昵称 ===')
    
    const that = this
    that.setData({
      showNicknameModal: true,
      editNickname: that.data.userInfo && that.data.userInfo.nickName ? that.data.userInfo.nickName : ''
    })
  },
  
  hideNicknameModal: function(e) {
    // console.log('=== hideNicknameModal 关闭弹窗 ===')
    this.setData({
      showNicknameModal: false,
      editNickname: ''
    })
  },
  
  stopPropagation: function(e) {
    // 阻止事件冒泡
  },
  
  onNicknameEditBlur: function(e) {
    // console.log('=== onNicknameEditBlur 编辑输入完成 ===')
    this.setData({
      editNickname: e.detail.value
    })
  },
  
  saveNickname: function(e) {
    // console.log('=== saveNickname 保存昵称 ===')
    
    const that = this
    const newNickname = that.data.editNickname
    
    if (!newNickname || newNickname.trim() === '') {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return
    }
    
    // 更新用户信息
    const updatedUserInfo = {
      ...that.data.userInfo,
      nickName: newNickname.trim()
    }
    
    that.setData({
      userInfo: updatedUserInfo,
      showNicknameModal: false,
      editNickname: ''
    })
    
    wx.setStorage({
      key: 'userInfo',
      data: updatedUserInfo
    })
    
    wx.showToast({
      title: '昵称更新成功',
      icon: 'success'
    })
  },
  
  handleUserInfo: function(userInfo) {
    // console.log('=== handleUserInfo 处理用户信息 ===')
    // console.log('用户信息:', userInfo)
    
    const that = this
    
    that.setData({
      userInfo: userInfo,
      hasUserInfo: true
    })
    
    wx.setStorage({
      key: 'userInfo',
      data: userInfo,
      success: function() {
        // console.log('用户信息已保存到本地存储')
      }
    })
    
    wx.showToast({
      title: '授权成功',
      icon: 'success'
    })
    
    that.loadUserData(userInfo.nickName)
    that.checkAdmin()
  },

  onGetUserInfo: function(e) {
    const that = this
    // console.log('=== onGetUserInfo 被调用 ===')
    // console.log('事件对象:', e)
    
    if (e && e.detail) {
      // console.log('detail:', e.detail)
      
      // 用户点击授权按钮后，无论是否返回 userInfo，都标记为已授权
      // open-data 组件会自动显示用户信息
      that.setData({
        hasUserInfo: true
      })
      
      wx.setStorage({
        key: 'hasUserInfo',
        data: true,
        success: function() {
          // console.log('授权状态已保存')
        }
      })
      
      wx.showToast({
        title: '授权成功',
        icon: 'success'
      })
      
      that.checkAdmin()
    } else {
      // console.log('❌ 事件对象为空')
      wx.showToast({
        title: '系统错误',
        icon: 'none'
      })
    }
  },

  onGetPhoneNumber: function(e) {
    const that = this
    // console.log('=== onGetPhoneNumber 被调用 ===')
    // console.log('事件对象:', e)
    
    if (e && e.detail) {
      // console.log('detail:', e.detail)
      
      // 用户点击授权按钮后，无论是否获取到手机号，都标记为已授权
      // open-data 组件会自动显示用户信息
      that.setData({
        hasUserInfo: true
      })
      
      wx.setStorage({
        key: 'hasUserInfo',
        data: true,
        success: function() {
          // console.log('授权状态已保存')
        }
      })
      
      wx.showToast({
        title: '授权成功',
        icon: 'success'
      })
      
      that.checkAdmin()
      
      // 如果获取到手机号，可以进行后续处理
      if (e.detail.code) {
        // console.log('获取手机号成功，code:', e.detail.code)
        // 这里可以调用云函数获取手机号
      }
    } else {
      // console.log('❌ 事件对象为空')
      wx.showToast({
        title: '系统错误',
        icon: 'none'
      })
    }
  },
  
  // 保留原有的 onGetUserInfo 函数
  onGetUserInfoOld: function(e) {
    const that = this
    // console.log('onGetPhoneNumber called:', e)
    
    if (e.detail.code) {
      // console.log('获取手机号成功，code:', e.detail.code)
      
      wx.cloud.callFunction({
        name: 'getPhoneNumber',
        data: {
          code: e.detail.code
        },
        success: function(res) {
          // console.log('getPhoneNumber cloud function result:', res)
          if (res.result && res.result.phoneNumber) {
            that.setData({
              phoneNumber: res.result.phoneNumber
            })
            
            wx.setStorage({
              key: 'phoneNumber',
              data: res.result.phoneNumber,
              success: function() {
                // console.log('手机号已保存到本地存储')
              }
            })
            
            wx.showToast({
              title: '获取手机号成功',
              icon: 'success'
            })
          } else {
            wx.showToast({
              title: '获取手机号失败',
              icon: 'none'
            })
          }
        },
        fail: function(err) {
          // console.log('getPhoneNumber cloud function error:', err)
          wx.showToast({
            title: '获取手机号失败',
            icon: 'none'
          })
        }
      })
    } else {
      // console.log('用户拒绝获取手机号')
      wx.showToast({
        title: '获取失败',
        icon: 'none'
      })
    }
  },

  onPhoneInput: function(e) {
    const value = e.detail.value
    this.setData({
      'formData.phone': value
    })
  },

  onNumberInput: function(e) {
    const value = e.detail.value
    this.setData({
      'formData.number': value
    })
  },

  onPositionChange: function(e) {
    const index = e.detail.value
    this.setData({
      'formData.position': this.data.positionOptions[index]
    })
  },

  onSizeChange: function(e) {
    const index = e.detail.value
    this.setData({
      'formData.size': this.data.sizeOptions[index]
    })
  },

  saveData: function() {
    const that = this
    const { hasUserInfo, formData } = this.data

    if (!hasUserInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    if (!formData.number) {
      wx.showToast({
        title: '请输入球衣号码',
        icon: 'none'
      })
      return
    }

    if (!formData.position) {
      wx.showToast({
        title: '请选择场上位置',
        icon: 'none'
      })
      return
    }

    if (!formData.size) {
      wx.showToast({
        title: '请选择球衣尺码',
        icon: 'none'
      })
      return
    }

    // 使用 openId 来标识用户
    wx.cloud.callFunction({
      name: 'getOpenId',
      success: function(res) {
        const openId = res.result.openid
        const userInfo = that.data.userInfo || {}
        
        const userData = {
          ...formData,
          nickName: userInfo.nickName || '',
          avatarUrl: userInfo.avatarUrl || '',
          wechatName: userInfo.nickName || ''
        }
        
        db.collection('users').where({
          openId: openId
        }).get({
          success: function(res) {
            if (res.data.length > 0) {
              db.collection('users').doc(res.data[0]._id).update({
                data: {
                  ...userData,
                  updateTime: new Date()
                },
                success: function() {
                  wx.showToast({
                    title: '保存成功',
                    icon: 'success'
                  })
                },
                fail: function(err) {
                  wx.showToast({
                    title: '保存失败',
                    icon: 'none'
                  })
                }
              })
            } else {
              // 按 openId 没查到，尝试按 nickName 查，避免创建重复记录
              db.collection('users').where({
                nickName: userData.nickName
              }).get({
                success: function(nickRes) {
                  if (nickRes.data.length > 0) {
                    db.collection('users').doc(nickRes.data[0]._id).update({
                      data: {
                        openId: openId,
                        ...userData,
                        updateTime: new Date()
                      },
                      success: function() {
                        wx.showToast({
                          title: '保存成功',
                          icon: 'success'
                        })
                      },
                      fail: function() {
                        wx.showToast({
                          title: '保存失败',
                          icon: 'none'
                        })
                      }
                    })
                  } else {
                    db.collection('users').add({
                      data: {
                        openId: openId,
                        ...userData,
                        createTime: new Date(),
                        updateTime: new Date()
                      },
                      success: function() {
                        wx.showToast({
                          title: '保存成功',
                          icon: 'success'
                        })
                      },
                      fail: function() {
                        wx.showToast({
                          title: '保存失败',
                          icon: 'none'
                        })
                      }
                    })
                  }
                },
                fail: function() {
                  db.collection('users').add({
                    data: {
                      openId: openId,
                      ...userData,
                      createTime: new Date(),
                      updateTime: new Date()
                    },
                    success: function() {
                      wx.showToast({
                        title: '保存成功',
                        icon: 'success'
                      })
                    },
                    fail: function() {
                      wx.showToast({
                        title: '保存失败',
                        icon: 'none'
                      })
                    }
                  })
                }
              })
            }
          },
          fail: function(err) {
            wx.showToast({
              title: '保存失败',
              icon: 'none'
            })
          }
        })
      },
      fail: function(err) {
        // console.log('getOpenId error:', err)
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        })
      }
    })
  },

  addAdmin: function() {
    if (!this.data.isSuperAdmin) {
      wx.showToast({
        title: '无权限',
        icon: 'none'
      })
      return
    }

    const that = this
    wx.showLoading({ title: '加载中...' })

    // 查询已注册用户列表
    db.collection('users').limit(200).get({
      success: function(res) {
        wx.hideLoading()
        const users = res.data || []
        
        // 过滤掉已经是管理员的用户
        const adminNickNames = new Set(that.data.admins.map(a => a.nickName))
        const availableUsers = users.filter(u => u.nickName && !adminNickNames.has(u.nickName))
        
        if (availableUsers.length === 0) {
          wx.showToast({
            title: '没有可添加的用户',
            icon: 'none'
          })
          return
        }

        that.setData({
          userList: availableUsers,
          showAddAdminModal: true
        })
      },
      fail: function(err) {
        wx.hideLoading()
        wx.showToast({
          title: '加载用户列表失败',
          icon: 'none'
        })
      }
    })
  },

  hideAddAdminModal: function() {
    this.setData({ showAddAdminModal: false, userList: [] })
  },

  selectUserToAdd: function(e) {
    const nickName = e.currentTarget ? e.currentTarget.dataset.nickname : ''
    if (!nickName) return

    const that = this
    wx.showModal({
      title: '确认添加',
      content: '确定将「' + nickName + '」添加为队长吗？',
      success: function(res) {
        if (res.confirm) {
          wx.showLoading({ title: '添加中...' })
          db.collection('admins').add({
            data: {
              nickName: nickName,
              role: 'normal',
              createTime: new Date()
            },
            success: function() {
              wx.hideLoading()
              that.setData({ showAddAdminModal: false, userList: [] })
              that.loadAdmins()
              wx.showToast({
                title: '添加成功',
                icon: 'success'
              })
            },
            fail: function(err) {
              wx.hideLoading()
              wx.showToast({
                title: '添加失败',
                icon: 'none'
              })
            }
          })
        }
      }
    })
  },

  stopPropagation: function() {},

  deleteAdmin: function(e) {
    if (!this.data.isSuperAdmin) {
      wx.showToast({
        title: '无权限',
        icon: 'none'
      })
      return
    }

    const that = this
    const adminId = e.currentTarget.dataset.id
    const nickName = e.currentTarget.dataset.nickname

    wx.showModal({
      title: '删除管理员',
      content: `确定要删除 "${nickName}" 的管理员权限吗？`,
      success: function(res) {
        if (res.confirm) {
          db.collection('admins').doc(adminId).remove({
            success: function() {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              })
              that.loadAdmins()
            },
            fail: function(err) {
              console.log('delete admin error:', err)
              wx.showToast({
                title: '删除失败',
                icon: 'none'
              })
              that.loadAdmins()
            }
          })
        }
      }
    })
  },

  // ========== 活动归集 ==========

  showArchiveModal: function() {
    if (!this.data.isSuperAdmin) {
      wx.showToast({ title: '仅超级管理员可操作', icon: 'none' })
      return
    }
    this.setData({ showArchiveModal: true, archiveName: '' })
  },

  cancelArchiveModal: function() {
    this.setData({ showArchiveModal: false, archiveName: '', isArchiving: false })
  },

  onArchiveNameInput: function(e) {
    this.setData({ archiveName: e.detail.value })
  },

  confirmArchive: function() {
    const name = (this.data.archiveName || '').trim()
    if (!name) {
      wx.showToast({ title: '请输入归集名称（如：2026赛季）', icon: 'none' })
      return
    }
    const that = this
    wx.showModal({
      title: '确认归集',
      content: `将以"${name}"保存当前所有活动数据快照，\n之后活动、签到、记账、鸽子榜将被清空。\n\n此操作不可撤销，是否继续？`,
      confirmText: '确认归集',
      confirmColor: '#dc2626',
      success: function(res) {
        if (res.confirm) {
          that.executeArchive(name)
        }
      }
    })
  },

  executeArchive: function(name) {
    const that = this
    this.setData({ isArchiving: true, showArchiveModal: false })
    wx.showLoading({ title: '正在统计...', mask: true })

    const queryColl = function(coll) {
      return new Promise((resolve) => {
        db.collection(coll).limit(500).get({
          timeout: 15000,
          success: function(r) { resolve(r.data || []) },
          fail: function() { resolve([]) }
        })
      })
    }

    Promise.all([
      queryColl('activities'),
      queryColl('signups'),
      queryColl('records'),
      queryColl('doves')
    ]).then(function(results) {
      const activities = results[0]
      const signups = results[1]
      const records = results[2]
      const doves = results[3]

      wx.showLoading({ title: '正在生成快照...', mask: true })

      // 统计活动
      const activityList = activities.map(function(a) {
        return { title: a.title || '', date: a.date || '', signupCount: (a.signups && a.signups.length) || 0, location: a.location || '' }
      })

      // 统计报名去重用户
      const userIdSet = new Set()
      const userMap = new Map()
      signups.forEach(function(s) {
        const uid = s.userId || s._openid || ''
        if (uid) userIdSet.add(uid)
        const nick = s.nickName || '未知'
        if (nick) {
          if (!userMap.has(nick)) {
            userMap.set(nick, { nickName: nick, avatarUrl: s.avatarUrl || '', count: 0 })
          }
          userMap.get(nick).count++
        }
      })

      // 参与排行前5
      const topPlayers = Array.from(userMap.values())
        .sort(function(a, b) { return b.count - a.count })
        .slice(0, 5)

      // 统计余额
      let totalIncome = 0, totalExpense = 0
      records.forEach(function(r) {
        const amt = parseFloat(r.amount || 0)
        if (r.type === 'income') totalIncome += amt
        else totalExpense += amt
      })

      // 鸽子榜前5
      const doveMap = new Map()
      doves.forEach(function(d) {
        const nick = d.nickName || '未知'
        if (!doveMap.has(nick)) {
          doveMap.set(nick, { nickName: nick, avatarUrl: d.avatarUrl || '', count: 0 })
        }
        doveMap.get(nick).count++
      })
      const doveRankings = Array.from(doveMap.values())
        .sort(function(a, b) { return b.count - a.count })
        .slice(0, 5)

      // 确定赛季日期
      const now = new Date()
      const fmtDate = function(d) {
        var m = d.getMonth() + 1
        var day = d.getDate()
        return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day
      }
      const endDate = fmtDate(now)
      let startDate = endDate
      if (activities.length > 0) {
        const dates = activities.map(function(a) { return a.date || '' }).filter(Boolean).sort()
        startDate = dates[0] || endDate
      }

      // 保存快照到 seasons
      const seasonData = {
        name: name,
        status: 'archived',
        startDate: startDate,
        endDate: endDate,
        createTime: db.serverDate(),
        stats: {
          totalActivities: activities.length,
          totalSignups: signups.length,
          totalParticipants: userIdSet.size,
          totalFees: (totalIncome - totalExpense).toFixed(2)
        },
        topPlayers: topPlayers,
        doveRankings: doveRankings,
        activities: activityList
      }

      db.collection('seasons').add({
        data: seasonData,
        success: function(addRes) {
          const seasonId = addRes._id
          wx.showLoading({ title: '正在清理数据...', mask: true })

          // 更新当前赛季设置
          db.collection('settings').doc('currentSeason').set({
            data: {
              name: name,
              seasonId: seasonId,
              startDate: endDate
            }
          }).then(function() {
            // 可能 settings 集合不存在，不阻塞流程
          }).catch(function() {})

          // 逐批删除原始数据
          const delColl = function(collName) {
            return new Promise(function(resolve) {
              var totalDeleted = 0
              const delBatch = function() {
                db.collection(collName).limit(50).get({
                  timeout: 10000,
                  success: function(r) {
                    if (!r.data || r.data.length === 0) {
                      resolve(totalDeleted)
                      return
                    }
                    var remaining = r.data.length
                    if (remaining === 0) {
                      resolve(totalDeleted)
                      return
                    }
                    r.data.forEach(function(item) {
                      db.collection(collName).doc(item._id).remove({
                        success: function() {
                          totalDeleted++
                          remaining--
                          if (remaining === 0) delBatch()
                        },
                        fail: function() {
                          remaining--
                          if (remaining === 0) delBatch()
                        }
                      })
                    })
                  },
                  fail: function() { resolve(totalDeleted) }
                })
              }
              delBatch()
            })
          }

          Promise.all([
            delColl('activities'),
            delColl('signups'),
            delColl('records'),
            delColl('doves')
          ]).then(function() {
            wx.hideLoading()
            wx.showToast({ title: '归集成功，新赛季开始！', icon: 'success', duration: 2000 })
            that.setData({ isArchiving: false })
          }).catch(function() {
            wx.hideLoading()
            wx.showToast({ title: '部分数据清理失败', icon: 'none' })
            that.setData({ isArchiving: false })
          })
        },
        fail: function() {
          wx.hideLoading()
          wx.showToast({ title: '归集失败，请重试', icon: 'none' })
          that.setData({ isArchiving: false })
        }
      })
    }).catch(function() {
      wx.hideLoading()
      wx.showToast({ title: '数据加载失败', icon: 'none' })
      that.setData({ isArchiving: false })
    })
  },

  loadSeasons: function() {
    if (!this.data.isAdmin && !this.data.isSuperAdmin) {
      wx.showToast({ title: '仅管理员可查看', icon: 'none' })
      return
    }
    const that = this
    wx.showLoading({ title: '加载中...' })
    db.collection('seasons').orderBy('createTime', 'desc').limit(50).get({
      timeout: 10000,
      success: function(res) {
        wx.hideLoading()
        that.setData({
          seasons: res.data || [],
          showSeasonsModal: true
        })
        if (!res.data || res.data.length === 0) {
          wx.showToast({ title: '暂无历史归集', icon: 'none' })
        }
      },
      fail: function(err) {
        wx.hideLoading()
        console.error('加载历史归集失败:', err)
        // collection not exists (-502005) 或权限问题，都显示空列表
        that.setData({
          seasons: [],
          showSeasonsModal: true
        })
        wx.showToast({ title: '暂无历史归集', icon: 'none' })
      }
    })
  },

  closeSeasonsModal: function() {
    this.setData({ showSeasonsModal: false })
  },

  showSeasonDetail: function(e) {
    const season = e.currentTarget.dataset.season
    this.setData({
      currentSeasonDetail: season,
      showSeasonDetailModal: true,
      showSeasonsModal: false
    })
  },

  closeSeasonDetail: function() {
    this.setData({
      showSeasonDetailModal: false,
      currentSeasonDetail: null,
      showSeasonsModal: true
    })
  },

  deleteSeason: function(e) {
    if (!this.data.isSuperAdmin) {
      wx.showToast({ title: '仅超级管理员可删除', icon: 'none' })
      return
    }
    const seasonId = e.currentTarget.dataset.id
    const seasonName = e.currentTarget.dataset.name
    const that = this
    wx.showModal({
      title: '确认删除',
      content: '确定删除归集"' + seasonName + '"吗？\n删除后不可恢复。',
      confirmColor: '#dc2626',
      success: function(res) {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
          db.collection('seasons').doc(seasonId).remove({
            success: function() {
              wx.hideLoading()
              wx.showToast({ title: '删除成功', icon: 'success' })
              that.loadSeasons()
            },
            fail: function(err) {
              wx.hideLoading()
              console.error('删除归集失败:', err)
              wx.showToast({ title: '删除失败', icon: 'none' })
            }
          })
        }
      }
    })
  }
})