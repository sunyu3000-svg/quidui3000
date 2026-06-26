// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 尝试查询 doves 集合
    const checkResult = await db.collection('doves').limit(1).get()
    
    return {
      success: true,
      message: 'doves 集合已存在',
      count: checkResult.data.length
    }
  } catch (err) {
    console.log('查询集合失败:', err)
    
    // 如果集合不存在，创建集合
    if (err.errCode === -502005 || (err.message && err.message.indexOf('not exist') > -1)) {
      try {
        // 添加一条测试数据来创建集合
        const addResult = await db.collection('doves').add({
          data: {
            activityId: 'test_activity',
            activityTitle: '测试活动',
            activityDate: '2026-06-09',
            userId: 'test_user',
            nickName: '测试用户',
            avatarUrl: '',
            createTime: new Date(),
            isTest: true
          }
        })
        
        console.log('测试数据添加成功:', addResult)
        
        // 删除测试数据
        try {
          await db.collection('doves').doc(addResult._id).remove()
          console.log('测试数据已删除')
        } catch (delErr) {
          console.log('删除测试数据失败（不影响集合创建）:', delErr)
        }
        
        return {
          success: true,
          message: 'doves 集合创建成功',
          addResult: addResult
        }
      } catch (createErr) {
        console.error('创建集合失败:', createErr)
        return {
          success: false,
          message: '创建 doves 集合失败',
          error: createErr.errMsg || createErr.message || JSON.stringify(createErr)
        }
      }
    }
    
    return {
      success: false,
      message: '检查 doves 集合失败',
      error: err.errMsg || err.message || JSON.stringify(err)
    }
  }
}