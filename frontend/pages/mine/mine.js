// pages/mine/mine.js - 我的页面

var app = getApp()
Page({
  data: {userinfo:''},




    /**
   * 生命周期函数--监听页面显示
   */
    onShow() {
      // 从内存拿
      this.setData({userinfo:app.globalData.userinfo})
      console.log('onShow拿到的全局用户数据：', app.globalData.userinfo)
    },

    logout:function(){
      app.exitUserInfo()
      this.setData({userinfo:''})
    }

})
