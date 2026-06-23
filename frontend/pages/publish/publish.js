// pages/publish/publish.js
const COS = require('../../utils/cos-wx-sdk-v5.js');
const { post } = require('../../utils/request');

Page({
  data: {
    content: '',         // 文案内容
    imgList: [],         // 图片本地临时路径（预览用）
    cosUrls: [],         // [{url, fileName}] 云端图片
    locationInfo: '',    // 所在位置
    selectTopic: '',     // 选中话题名称（展示用）
    selectTopicId: null, // 选中话题ID（提交接口用）
    remindUser: '',      // 提醒好友
    maxLength: 300,
    canSubmit: false,
    submitting: false    // 防止重复提交
  },

  // ══════════════════════ COS ══════════════════════

  _createCOS() {
    return new COS({
      getAuthorization: (options, callback) => {
        wx.request({
          method: 'GET',
          url: 'http://127.0.0.1:8000/api/credential/',
          dataType: 'json',
          success(result) {
            const data = result.data;
            const credentials = data && data.credentials;
            if (!data || !credentials) {
              console.error('[临时密钥] 获取失败');
              wx.showToast({ title: '上传凭证获取失败', icon: 'none' });
              return;
            }
            console.log('[临时密钥] 成功, 过期:', new Date(data.expiredTime * 1000).toLocaleString());
            callback({
              TmpSecretId: credentials.tmpSecretId,
              TmpSecretKey: credentials.tmpSecretKey,
              SecurityToken: credentials.sessionToken,
              StartTime: data.startTime,
              ExpiredTime: data.expiredTime,
            });
          },
          fail(err) {
            console.error('[临时密钥] 请求失败:', err);
            wx.showToast({ title: '上传凭证请求失败', icon: 'none' });
          }
        });
      }
    });
  },

  _uploadFile(cos, filePath) {
    return new Promise((resolve, reject) => {
      const fileName = Date.now() + '_' + filePath.split('/').pop();
      cos.uploadFile({
        Bucket: 'xcx-1412810729',
        Region: 'ap-guangzhou',
        Key: fileName,
        FilePath: filePath,
      }, function (err, data) {
        if (err) {
          console.error('[COS] 上传失败:', { fileName, error: err });
          reject(err);
        } else {
          const url = 'https://xcx-1412810729.cos.ap-guangzhou.myqcloud.com/' + fileName;
          console.log('[COS] 上传成功:', { fileName, url });
          resolve({ url, fileName });
        }
      });
    });
  },

  // ══════════════════════ 按钮状态 ══════════════════════

  refreshSubmit() {
    const hasContent = !!this.data.content.trim();
    const hasImg = this.data.imgList.length > 0;
    const allDone = this.data.imgList.length === this.data.cosUrls.length &&
      this.data.cosUrls.every(item => item && item.url);
    this.setData({ canSubmit: (hasContent || hasImg) && allDone && !this.data.submitting });
  },

  // ══════════════════════ 文案 ══════════════════════

  onContentInput(e) {
    this.setData({ content: e.detail.value });
    this.refreshSubmit();
  },

  // ══════════════════════ 图片 ══════════════════════

  async onAddImage() {
    const remain = 9 - this.data.imgList.length;
    if (remain <= 0) { wx.showToast({ title: '最多9张', icon: 'none' }); return; }

    const chooseRes = await new Promise(resolve => {
      wx.chooseImage({ count: remain, sizeType: ['original', 'compressed'], sourceType: ['album', 'camera'], success: resolve, fail: () => resolve(null) });
    });
    if (!chooseRes || !chooseRes.tempFilePaths.length) return;

    const newPaths = chooseRes.tempFilePaths;
    const startIdx = this.data.imgList.length;

    this.setData({
      imgList: this.data.imgList.concat(newPaths),
      cosUrls: this.data.cosUrls.concat(new Array(newPaths.length).fill(null))
    });
    this.refreshSubmit();

    wx.showLoading({ title: '上传中...', mask: true });
    const cos = this._createCOS();
    const results = await Promise.allSettled(newPaths.map(p => this._uploadFile(cos, p)));
    wx.hideLoading();

    const updatedCosUrls = [...this.data.cosUrls];
    let updatedImgList = [...this.data.imgList];
    const failIndices = [];

    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        updatedCosUrls[startIdx + i] = r.value;
      } else {
        failIndices.push(startIdx + i);
        console.error('[COS] 第' + (i + 1) + '张失败:', r.reason);
      }
    });

    if (failIndices.length > 0) {
      failIndices.sort((a, b) => b - a).forEach(idx => {
        updatedImgList.splice(idx, 1);
        updatedCosUrls.splice(idx, 1);
      });
      wx.showToast({ title: failIndices.length + '张上传失败已移除', icon: 'none' });
    }

    this.setData({ imgList: updatedImgList, cosUrls: updatedCosUrls });
    this.refreshSubmit();
  },

  onDeleteImage(e) {
    const i = e.currentTarget.dataset.index;
    const img = [...this.data.imgList], cos = [...this.data.cosUrls];
    img.splice(i, 1); cos.splice(i, 1);
    this.setData({ imgList: img, cosUrls: cos });
    this.refreshSubmit();
  },

  onPreviewImage(e) {
    wx.previewImage({ current: e.currentTarget.dataset.src, urls: this.data.imgList });
  },

  // ══════════════════════ 位置 / 话题 / 提醒 ══════════════════════

  onChooseLocation() {
    wx.chooseLocation({
      success: res => { this.setData({ locationInfo: res.name || res.address }); },
      fail: () => {}
    });
  },

  onGoTopic() {
    wx.navigateTo({ url: '/pages/topic/topic?topic=' + encodeURIComponent(this.data.selectTopic) });
  },

  onRemind() {
    wx.showToast({ title: '好友选择页待对接', icon: 'none' });
  },

  // ══════════════════════ 发布 ══════════════════════

  async submitPublish() {
    if (!this.data.canSubmit || this.data.submitting) return;

    // 兜底
    const allDone = this.data.imgList.length === this.data.cosUrls.length &&
      this.data.cosUrls.every(item => item && item.url);
    if (!allDone) { wx.showToast({ title: '素材仍在上传中', icon: 'none' }); return; }

    this.setData({ submitting: true, canSubmit: false });

    // 组装请求体 — 后端 CreateNewsSerializer 字段
    const body = {
      cover: this.data.cosUrls[0] ? this.data.cosUrls[0].url : '',
      content: this.data.content,
      address: this.data.locationInfo || undefined,
      imageList: this.data.cosUrls.map(item => ({
        key: item.fileName,
        cos_path: item.url
      }))
    };
    // 话题 — 后端外键，传 id
    if (this.data.selectTopicId) {
      body.topic = this.data.selectTopicId;
    }

    console.log('========== [发布] 请求体 ==========');
    console.log(JSON.stringify(body, null, 2));
    console.log('===================================');

    try {
      const res = await post('/api/news/', body, { loading: true });
      console.log('[发布] 后端返回:', res);

      // 发布成功 → 跳转结果页
      wx.redirectTo({ url: '/pages/result/result' });
    } catch (err) {
      console.error('[发布] 失败:', err);
      wx.showToast({ title: '发布失败，请重试', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
      this.refreshSubmit();
    }
  },

  // ══════════════════════ 生命周期 ══════════════════════

  onLoad() {},
  onShow() {},
  onReady() {},
  onHide() {},
  onUnload() {}
})
