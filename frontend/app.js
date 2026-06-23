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

  // ══════════════════════ 登录态工具 ══════════════════════

  /**
   * 是否已登录（有有效 token）
   */
  isLoggedIn: function () {
    var info = this.globalData.userinfo;
    return !!(info && info.token);
  },

  /**
   * 要求登录 — 未登录时弹窗引导，返回 false；已登录返回 true
   * 用于按钮点击时的前置拦截
   */
  requireLogin: function () {
    if (this.isLoggedIn()) return true;
    wx.showModal({
      title: '需要登录',
      content: '登录后才能使用此功能',
      confirmText: '去登录',
      success: function (res) {
        if (res.confirm) {
          wx.navigateTo({ url: '/pages/login/login' });
        }
      }
    });
    return false;
  },

  /**
   * 强制跳转登录（清除旧登录态）
   */
  redirectLogin: function () {
    this.exitUserInfo();
    wx.navigateTo({ url: '/pages/login/login' });
  },

  // ══════════════════════ 用户信息管理 ══════════════════════

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
