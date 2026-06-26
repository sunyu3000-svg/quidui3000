// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 查询所有报名记录
    const signupRes = await db.collection('signups').get()
    console.log('signups集合记录:', signupRes.data.length)
    
    // 查询所有活动记录
    const activityRes = await db.collection('activities').get()
    console.log('activities集合记录:', activityRes.data.length)
    
    // 检查报名记录的status字段
    const statusValues = new Set()
    signupRes.data.forEach(s => {
      statusValues.add(JSON.stringify(s.status))
    })
    console.log('status字段的值:', Array.from(statusValues))
    
    // 检查activityId字段
    const activityIds = signupRes.data.map(s => s.activityId).filter(Boolean)
    console.log('activityId示例:', activityIds.slice(0, 5))
    
    // 检查活动的_id
    const activityIdsFromActivities = activityRes.data.map(a => a._id)
    console.log('活动_id示例:', activityIdsFromActivities.slice(0, 5))
    
    return {
      success: true,
      signupsCount: signupRes.data.length,
      activitiesCount: activityRes.data.length,
      statusValues: Array.from(statusValues),
      sampleSignupActivityIds: activityIds.slice(0, 3),
      sampleActivityIds: activityIdsFromActivities.slice(0, 3)
    }
  } catch (err) {
    console.error('查询失败:', err)
    return {
      success: false,
      message: err.message
    }
  }
}
