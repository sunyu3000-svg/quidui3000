const cloud = require('wx-server-sdk')
cloud.init()

exports.main = async (event, context) => {
  const { code } = event
  
  try {
    const result = await cloud.openapi.phoneNumber.getPhoneNumber({
      code: code
    })
    
    return {
      success: true,
      phoneNumber: result.phoneNumber || result.detail?.phoneNumber
    }
  } catch (err) {
    return {
      success: false,
      message: err.message
    }
  }
}
