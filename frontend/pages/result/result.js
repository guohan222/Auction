// pages/result/result.js - 发布结果页
Page({

  // 继续发布 → 回到发布页
  onContinuePublish() {
    wx.navigateBack({ delta: 1 });
  },

  // 返回首页 → 切换到首页tab
  onGoHome() {
    wx.switchTab({ url: '/pages/index/index' });
  }
})
