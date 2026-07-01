const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  try {
    const collections = event.collections || ['activities', 'signups', 'doves', 'likes', 'visitors', 'impressions']
    const results = []
    
    for (const collectionName of collections) {
      try {
        let deletedCount = 0
        
        const firstResult = await db.collection(collectionName).limit(100).get()
        let records = firstResult.data || []
        
        console.log(`开始清理 ${collectionName}，当前记录数: ${records.length}`)
        
        while (records.length > 0) {
          const batchDelete = db.collection(collectionName).where({
            _id: _.in(records.map(r => r._id))
          }).remove()
          
          const deleteResult = await batchDelete
          deletedCount += deleteResult.stats.removed || 0
          
          console.log(`  批次删除: ${records.length} 条，实际删除: ${deleteResult.stats.removed}`)
          
          const nextResult = await db.collection(collectionName).limit(100).get()
          records = nextResult.data || []
        }
        
        results.push({
          collection: collectionName,
          deleted: deletedCount,
          success: true
        })
        
        console.log(`完成清理 ${collectionName}，共删除 ${deletedCount} 条`)
        
      } catch (collectionErr) {
        console.error(`清理 ${collectionName} 失败:`, collectionErr)
        results.push({
          collection: collectionName,
          deleted: 0,
          success: false,
          error: collectionErr.message
        })
      }
    }
    
    const totalDeleted = results.reduce((sum, item) => sum + item.deleted, 0)
    const allSuccess = results.every(item => item.success)
    
    return {
      success: allSuccess,
      totalDeleted: totalDeleted,
      message: `共清理 ${totalDeleted} 条数据`,
      details: results
    }
    
  } catch (err) {
    console.error('清理数据失败:', err)
    return {
      success: false,
      totalDeleted: 0,
      message: '清理失败: ' + err.message,
      details: []
    }
  }
}