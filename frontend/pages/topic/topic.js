// pages/topic/topic.js
const { get } = require('../../utils/request');

Page({
  data: {
    selected: '',       // 当前选中话题的 title
    topicList: [],      // 话题列表
    loading: true,
    loadingMore: false,
    nomore: false,
    maxId: null,
    minId: null
  },

  onLoad(options) {
    if (options.topic) {
      this.setData({ selected: decodeURIComponent(options.topic) });
    }
    this.fetchFirstPage();
  },

  // ══════════════════════ 首屏加载 ══════════════════════

  async fetchFirstPage() {
    this.setData({ loading: true, nomore: false });
    try {
      const res = await get('/api/topic/', {}, { loading: false });
      const list = res.results || [];
      this.setData({
        topicList: list,
        loading: false,
        maxId: list.length > 0 ? list[0].id : null,
        minId: list.length > 0 ? list[list.length - 1].id : null,
        nomore: list.length < 10
      });
    } catch (err) {
      console.error('[话题] 加载失败:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败，下拉重试', icon: 'none' });
    }
  },

  // ══════════════════════ 下拉刷新 ══════════════════════

  async onPullDownRefresh() {
    if (!this.data.maxId) { await this.fetchFirstPage(); wx.stopPullDownRefresh(); return; }
    try {
      const res = await get('/api/topic/', { max_id: this.data.maxId }, { loading: false });
      const fresh = res.results || [];
      if (fresh.length > 0) {
        this.setData({
          topicList: fresh.concat(this.data.topicList),
          maxId: fresh[0].id
        });
      }
    } catch (err) {
      console.error('[话题] 下拉刷新失败:', err);
    }
    wx.stopPullDownRefresh();
  },

  // ══════════════════════ 上拉加载 ══════════════════════

  async onReachBottom() {
    if (this.data.loadingMore || this.data.nomore || !this.data.minId) return;
    this.setData({ loadingMore: true });
    try {
      const res = await get('/api/topic/', { min_id: this.data.minId }, { loading: false });
      const older = res.results || [];
      if (older.length > 0) {
        this.setData({
          topicList: this.data.topicList.concat(older),
          minId: older[older.length - 1].id,
          nomore: older.length < 10
        });
      } else {
        this.setData({ nomore: true });
      }
    } catch (err) {
      console.error('[话题] 上拉加载失败:', err);
    }
    this.setData({ loadingMore: false });
  },

  // ══════════════════════ 选中话题 ══════════════════════

  onSelectTopic(e) {
    const item = e.currentTarget.dataset.item;
    const pages = getCurrentPages();
    const publishPage = pages[pages.length - 2];
    if (publishPage) {
      // 回填：加 # 前缀用于展示，id 用于提交接口
      publishPage.setData({
        selectTopic: '#' + item.title,
        selectTopicId: item.id
      });
    }
    wx.navigateBack({ delta: 1 });
  }
})
