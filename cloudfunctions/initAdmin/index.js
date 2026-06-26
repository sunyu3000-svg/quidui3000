// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

const db = cloud.database()

async function initCollections() {
  const collections = ['impressions', 'users', 'activities', 'signups', 'admins', 'likes', 'visitors']
  
  for (const collectionName of collections) {
    try {
      await db.collection(collectionName).count()
    } catch (err) {
      if (err.errMsg && err.errMsg.includes('collection not exists')) {
        await db.createCollection(collectionName)
        console.log(`Created collection: ${collectionName}`)
      } else {
        throw err
      }
    }
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  
  try {
    await initCollections()
    
    const adminResult = await db.collection('admins').where({
      openId: OPENID
    }).get()
    
    if (adminResult.data.length === 0) {
      await db.collection('admins').add({
        data: {
          openId: OPENID,
          role: 'super',
          createTime: new Date()
        }
      })
      return { success: true, message: '已成为超级管理员，集合已初始化' }
    } else {
      await db.collection('admins').where({
        openId: OPENID
      }).update({
        data: {
          role: 'super',
          updateTime: new Date()
        }
      })
      return { success: true, message: '已升级为超级管理员' }
    }
  } catch (err) {
    return { success: false, message: err.message }
  }
}