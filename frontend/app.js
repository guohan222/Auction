// app.js
App({
  onLaunch() {
    // 消息tab显示红点角标（index从0开始：首页0 拍卖1 发布2 消息3 我的4）
    wx.setTabBarBadge({ index: 3, text: '8' });

    // 从本地获取用户信息加载到内存中
    var userinfo = wx.getStorageSync('userinfo')
    if (userinfo) {
      this.globalData.userinfo = userinfo;
    }
  },

  globalData: { userinfo: '' },

  // 初始化用户信息
  initUserInfo: function (res, e) {
    // res: {token, phone}  来自后端登录接口返回
    // e:   {nickName, avatarUrl}  来自 wx.getUserProfile 返回
    var info = {
      token: res.token,
      phone: res.phone,
      nickName: e.nickName,
      avatarUrl: e.avatarUrl
    }
    // 全局内存
    this.globalData.userinfo = info;
    // 本地持久化
    wx.setStorageSync('userinfo', info);
  },

  // 退出登录
  exitUserInfo: function () {
    this.globalData.userinfo = '';
    wx.removeStorageSync('userinfo');
  }
})
