// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 获取所有活动记录
    const activitiesRes = await db.collection('activities').get()
    const activities = activitiesRes.data
    
    console.log('找到活动记录:', activities.length)
    
    // 为每条活动记录添加 activityId 字段
    for (const activity of activities) {
      // 使用 _id 作为 activityId
      const activityId = activity._id
      
      await db.collection('activities').doc(activity._id).update({
        data: {
          activityId: activityId
        }
      })
      
      console.log(`更新活动 ${activity.title}: 添加 activityId = ${activityId}`)
    }
    
    return {
      success: true,
      message: `成功更新 ${activities.length} 条活动记录`
    }
  } catch (err) {
    console.error('批量更新失败:', err)
    return {
      success: false,
      message: err.message
    }
  }
}
