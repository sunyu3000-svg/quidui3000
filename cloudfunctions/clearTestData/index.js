// 云函数：清空测试数据
// 使用方法：在小程序中调用 wx.cloud.callFunction({ name: 'clearTestData', data: { collections: ['activities', 'signups', 'doves', 'likes', 'visitors', 'impressions'] } })

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const collections = event.collections || ['activities', 'signups', 'doves', 'likes', 'visitors', 'impressions']
    let totalDeleted = 0
    
    for (const collectionName of collections) {
      // 获取该集合的所有记录
      const result = await db.collection(collectionName).limit(1000).get()
      let records = result.data || []
      
      // 如果有更多记录，继续获取
      let skip = 0
      while (records.length > 0 && skip < 10000) {
        // 删除记录
        for (const record of records) {
          await db.collection(collectionName).doc(record._id).remove()
          totalDeleted++
        }
        
        skip += records.length
        const nextResult = await db.collection(collectionName).skip(skip).limit(1000).get()
        records = nextResult.data || []
      }
      
      console.log(`已清理 ${collectionName} 集合中的所有数据`)
    }
    
    return {
      success: true,
      message: `成功清理 ${totalDeleted} 条数据`
    }
  } catch (err) {
    console.error('清理数据失败:', err)
    return {
      success: false,
      message: '清理失败: ' + err.message
    }
  }
}
