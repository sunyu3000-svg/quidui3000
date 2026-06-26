// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 获取所有signups记录
    const result = await db.collection('signups').get()
    const records = result.data
    console.log('共找到', records.length, '条记录')
    
    // 批量更新每条记录
    let successCount = 0
    for (let i = 0; i < records.length; i++) {
      const record = records[i]
      
      try {
        await db.collection('signups').doc(record._id).update({
          data: {
            // 修复字段名并统一activityId值
            activityId: 'test-activity-001',
            // 添加avatarUrl字段（如果不存在）
            avatarUrl: record.avatarUrl || ''
          }
        })
        successCount++
        console.log('更新成功:', record._id)
      } catch (err) {
        console.error('更新失败:', record._id, err)
      }
    }
    
    return {
      success: true,
      message: `成功更新 ${successCount}/${records.length} 条记录`,
      updatedCount: successCount,
      totalCount: records.length
    }
    
  } catch (err) {
    console.error('批量更新失败:', err)
    return {
      success: false,
      message: '批量更新失败',
      error: err.message
    }
  }
}