/**
 * 全局请求封装
 */

// 后端基础地址
const BASE_URL = 'http://127.0.0.1:8000';

/**
 * 统一请求
 */
function request(options = {}) {
  const { url = '', method = 'GET', data = {}, loading = true, auth = true } = options;

  if (loading) wx.showLoading({ title: '加载中...', mask: true });

  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const app = getApp();
    const userinfo = app.globalData.userinfo;
    if (userinfo && userinfo.token) {
      headers['Authorization'] = 'Bearer ' + userinfo.token;
    }
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + url,
      method, data,
      header: headers,
      success(res) {
        if (loading) wx.hideLoading();
        resolve(res.data);
      },
      fail(err) {
        if (loading) wx.hideLoading();
        wx.showToast({ title: '网络异常，请重试', icon: 'none' });
        reject(err);
      }
    });
  });
}

function get(url, data = {}, opts = {}) { return request({ ...opts, url, data, method: 'GET' }); }
function post(url, data = {}, opts = {}) { return request({ ...opts, url, data, method: 'POST' }); }

module.exports = { BASE_URL, request, get, post };
