// pages/test/test.js

var app =getApp();
Page({

  /**
   * 页面的初始数据
   */
  data: {
    phone: '13797330232',
    code: '',
    // 辅助UI状态
    sending: false,
    countdown: 0,
    canLogin: false,
    phoneFocus: false,
    codeFocus: false
  },


  /**
   * 数据的双向绑定
   */
  bindPhone: function (e) {
    // console.log(e);
    this.setData({ phone: e.detail.value })
    this.updateLoginState();
  },
  bindCode: function (e) {
    // console.log(e);
    this.setData({ code: e.detail.value })
    console.log(this.data.code);
    this.updateLoginState();
  },

  // 清空手机号
  clearPhone: function () {
    this.setData({ phone: '' });
    this.updateLoginState();
  },

  // 清空验证码
  clearCode: function () {
    this.setData({ code: '' });
    this.updateLoginState();
  },

  // 更新登录按钮可用态
  updateLoginState: function () {
    const phoneValid = this.data.phone.length === 11;
    const codeValid = this.data.code.length > 0;
    this.setData({ canLogin: phoneValid && codeValid });
  },

  // 输入框聚焦
  onPhoneFocus: function () { this.setData({ phoneFocus: true }); },
  onPhoneBlur:  function () { this.setData({ phoneFocus: false }); },
  onCodeFocus:  function () { this.setData({ codeFocus: true }); },
  onCodeBlur:   function () { this.setData({ codeFocus: false }); },


  /**
   * 发送短信
   */
  sendCode: function (e) {
    const that = this;
    // 倒计时中直接拦截
    if (that.data.sending) return;
  
    // 手机号长度校验
    if (that.data.phone.length !== 11) {
      wx.showToast({ title: '手机号长度错误', icon: 'none' })
      return;
    }
    // 正则格式校验
    const phoneReg = /^(1[3-9])\d{9}$/;
    if (!phoneReg.test(that.data.phone)) {
      wx.showToast({ title: '手机号格式错误', icon: 'none' })
      return;
    }
  
    wx.request({
      url: 'http://127.0.0.1:8000/api/message/',
      data: { phone: that.data.phone },
      method: "GET",
      success: (res) => {
        if (res.data.status) {
          wx.showToast({ title: res.data.message, icon: 'none' })
          // 初始化倒计时状态
          that.setData({ sending: true, countdown: 60 });
          that.timer = setInterval(() => {
            const newCd = that.data.countdown - 1;
            if (newCd <= 0) {
              clearInterval(that.timer);
              that.setData({ sending: false, countdown: 0 });
              that.timer = null;
            } else {
              that.setData({ countdown: newCd });
            }
          }, 1000);
        } else {
          wx.showToast({ title: res.data.message, icon: 'none' })
        }
      }
    })
  },
  // 页面销毁清除定时器
  onUnload: function () {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },


  /**
   * 登录
   */
  login: function (e) {
    // 前端兜底校验
    if (!this.data.canLogin) return;

    wx.request({
      url: 'http://127.0.0.1:8000/api/login/',
      data: { phone: this.data.phone, code: this.data.code },
      method: "POST",
      success: (res) => {
        if(res.data.status){
          // 初始化用户信息
          console.log(e);
          console.log(e.detail.userInfo);
          app.initUserInfo(res.data.data,e.detail.userInfo)
          wx.navigateBack();
        }else{
          wx.showToast({title:'登录失败',icon:'none'})
        }
      },
    })
  },








  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
    if (this.timer) { clearInterval(this.timer); }
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    if (this.timer) { clearInterval(this.timer); }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})
