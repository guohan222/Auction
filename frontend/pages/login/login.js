// pages/login/login.js
const { get, post } = require('../../utils/request');
var app = getApp();

Page({
  data: {
    phone: '',
    code: '',
    // 辅助UI状态
    sending: false,
    countdown: 0,
    canLogin: false,
    phoneFocus: false,
    codeFocus: false
  },

  // ══════════════════════ 数据绑定 ══════════════════════

  bindPhone: function (e) {
    this.setData({ phone: e.detail.value });
    this.updateLoginState();
  },
  bindCode: function (e) {
    this.setData({ code: e.detail.value });
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

  // ══════════════════════ 发送短信 ══════════════════════

  sendCode: async function () {
    if (this.data.sending) return;

    // 手机号长度校验
    if (this.data.phone.length !== 11) {
      wx.showToast({ title: '手机号长度错误', icon: 'none' });
      return;
    }
    // 正则格式校验
    const phoneReg = /^(1[3-9])\d{9}$/;
    if (!phoneReg.test(this.data.phone)) {
      wx.showToast({ title: '手机号格式错误', icon: 'none' });
      return;
    }

    try {
      const res = await get('/api/message/', { phone: this.data.phone }, { loading: false });
      if (res.status) {
        wx.showToast({ title: res.message || '验证码已发送', icon: 'none' });
        // 初始化倒计时状态
        this.setData({ sending: true, countdown: 60 });
        this.timer = setInterval(() => {
          const newCd = this.data.countdown - 1;
          if (newCd <= 0) {
            clearInterval(this.timer);
            this.setData({ sending: false, countdown: 0 });
            this.timer = null;
          } else {
            this.setData({ countdown: newCd });
          }
        }, 1000);
      } else {
        wx.showToast({ title: res.message || '发送失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '网络异常，请重试', icon: 'none' });
    }
  },

  // ══════════════════════ 登录 ══════════════════════

  login: async function (e) {
    if (!this.data.canLogin) return;

    try {
      const res = await post('/api/login/', {
        phone: this.data.phone,
        code: this.data.code,
        nickname: e.detail.userInfo.nickName,
        avatar: e.detail.userInfo.avatarUrl
      }, { loading: true });

      if (res.status) {
        // 初始化用户信息
        console.log('[登录] 成功:', res.data);
        app.initUserInfo(res.data, e.detail.userInfo);
        wx.navigateBack();
      } else {
        wx.showToast({ title: res.message || '登录失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '网络异常，请重试', icon: 'none' });
    }
  },

  // ══════════════════════ 生命周期 ══════════════════════

  onLoad() {},

  onReady() {},

  onShow() {},

  onHide() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  },

  onUnload() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  },

  onPullDownRefresh() {},

  onReachBottom() {},

  onShareAppMessage() {}
})
