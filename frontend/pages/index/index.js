// pages/index/index.js - 首页动态流（瀑布流）
const { get } = require('../../utils/request');

Page({
  data: {
    newsList: [],       // 原始动态列表
    leftList: [],       // 左列
    rightList: [],      // 右列
    loading: true,
    loadingMore: false,
    nomore: false,
    maxId: null,
    minId: null
  },

  onLoad() { this.fetchFirstPage(); },

  // ══════════════════════ 瀑布流分列 ══════════════════════

  _buildWaterfall(list) {
    const fmt = this._formatList(list);
    const left = [], right = [];
    let leftH = 0, rightH = 0;
    fmt.forEach(item => {
      // 估算高度：有封面图 +60，有内容+内容长度
      let h = 140; // 基础：头像行+底部统计
      if (item.cover) h += 200;
      if (item.content) h += Math.min(item.content.length, 60) * 0.8;
      if (leftH <= rightH) {
        left.push(item); leftH += h;
      } else {
        right.push(item); rightH += h;
      }
    });
    return { left, right };
  },

  _setList(fullList) {
    const { left, right } = this._buildWaterfall(fullList);
    this.setData({
      newsList: fullList,
      leftList: left,
      rightList: right
    });
  },

  // ══════════════════════ 首屏 ══════════════════════

  async fetchFirstPage() {
    this.setData({ loading: true, nomore: false });
    try {
      const res = await get('/api/news/', {}, { loading: false });
      const list = res.results || [];
      this._setList(list);
      this.setData({
        loading: false,
        maxId: list.length > 0 ? list[0].id : null,
        minId: list.length > 0 ? list[list.length - 1].id : null,
        nomore: list.length < 10
      });
    } catch (err) {
      console.error('[首页] 加载失败:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败，下拉重试', icon: 'none' });
    }
  },

  // ══════════════════════ 下拉刷新 ══════════════════════

  async onPullDownRefresh() {
    if (!this.data.maxId) { await this.fetchFirstPage(); wx.stopPullDownRefresh(); return; }
    try {
      const res = await get('/api/news/', { max_id: this.data.maxId }, { loading: false });
      const fresh = res.results || [];
      if (fresh.length > 0) {
        const merged = this._formatList(fresh).concat(this.data.newsList);
        this._setList(merged);
        this.setData({ maxId: fresh[0].id });
      }
    } catch (err) {
      console.error('[首页] 下拉刷新失败:', err);
    }
    wx.stopPullDownRefresh();
  },

  // ══════════════════════ 上拉加载 ══════════════════════

  async onReachBottom() {
    if (this.data.loadingMore || this.data.nomore || !this.data.minId) return;
    this.setData({ loadingMore: true });
    try {
      const res = await get('/api/news/', { min_id: this.data.minId }, { loading: false });
      const older = res.results || [];
      if (older.length > 0) {
        const merged = this.data.newsList.concat(this._formatList(older));
        this._setList(merged);
        this.setData({
          minId: older[older.length - 1].id,
          nomore: older.length < 10
        });
      } else {
        this.setData({ nomore: true });
      }
    } catch (err) {
      console.error('[首页] 上拉加载失败:', err);
    }
    this.setData({ loadingMore: false });
  },

  // ══════════════════════ 跳转详情 ══════════════════════

  onTapItem(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/detail/detail?id=' + id });
  },

  // ══════════════════════ 格式化 ══════════════════════

  _formatList(list) {
    const avatarColors = ['#E8836E','#F0A060','#8EB8D0','#88C888','#B6915A','#60B8A0','#7E8DC8','#A888D0','#E888A0','#D07070'];
    return list.map((item, i) => ({
      ...item,
      _avatarChar: item.user && item.user.nickname ? item.user.nickname[0] : '?',
      _avatarBg: avatarColors[(item.user && item.user.id || i) % avatarColors.length],
      _timeText: this._formatTime(item.create_date)
    }));
  },

  _formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr.replace(/-/g, '/'));
    const diff = Date.now() - d.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return '刚刚';
    if (min < 60) return min + '分钟前';
    const hour = Math.floor(min / 60);
    if (hour < 24) return hour + '小时前';
    const day = Math.floor(hour / 24);
    if (day < 30) return day + '天前';
    return dateStr.substr(0, 10);
  }
})
