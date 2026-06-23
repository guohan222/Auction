// pages/detail/detail.js - 动态详情
const { get, post } = require('../../utils/request');

Page({
  data: {
    detail: {},
    commentTree: [],        // 一级评论列表
    commentText: '',
    replyTo: '',            // 回复目标昵称
    replyId: null,          // 回复的评论id
    rootId: null,           // 回复的根评论id（回复子评论时用）
    loading: true,
    expandingId: null,      // 正在加载子评论的父评论id
    commentLoading: false,
    commentNomore: false,
    commentMinId: null
  },

  onLoad(options) {
    if (options.id) {
      this.fetchDetail(options.id);
    }
  },

  // ══════════════════════ 获取详情 ══════════════════════

  async fetchDetail(id) {
    this.setData({ loading: true });
    try {
      const res = await get('/api/news/' + id, {}, { loading: false });
      const avatarColors = ['#E8836E','#F0A060','#8EB8D0','#88C888','#B6915A','#60B8A0','#7E8DC8','#A888D0'];
      const tree = res.comment ? Object.values(res.comment) : [];
      tree.forEach(c => { c._expanded = false; });
      this.setData({
        detail: {
          ...res,
          _avatarChar: res.user ? res.user.nickname[0] : '?',
          _avatarBg: avatarColors[(res.user ? res.user.id : 0) % avatarColors.length]
        },
        commentTree: tree,
        loading: false,
        comment_count: res.comment_count || 0,
        commentMinId: tree.length > 0 ? tree[tree.length - 1].id : null,
        commentNomore: tree.length < 10
      });
    } catch (err) {
      console.error('[详情] 加载失败:', err);
      this.setData({ loading: false });
    }
  },

  // ══════════════════════ 图片预览 ══════════════════════

  onPreviewImage(e) {
    const src = e.currentTarget.dataset.src;
    const urls = this.data.detail.imageList.map(i => i.cos_path);
    wx.previewImage({ current: src, urls });
  },

  // ══════════════════════ 回复 ══════════════════════

  onCommentInput(e) {
    this.setData({ commentText: e.detail.value });
  },

  // 数据: id=被回复评论id, name=被回复者昵称, root=所属根评论id（子评论时传）
  onReply(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      replyTo: e.currentTarget.dataset.name,
      replyId: id,
      rootId: e.currentTarget.dataset.root || id,
      commentText: ''
    });
  },

  // 取消回复
  onCancelReply() {
    this.setData({ replyTo: '', replyId: null, rootId: null, commentText: '' });
  },

  // ══════════════════════ 展开 / 折叠子评论 ══════════════════════

  async onExpandChildren(e) {
    const rootId = e.currentTarget.dataset.id;
    const tree = this.data.commentTree;
    const parent = tree.find(c => c.id === rootId);
    if (!parent) return;

    if (parent._expanded) {
      parent._expanded = false;
      parent.children = parent._previewChildren; // 恢复原始预览子评论
      this.setData({ commentTree: tree });
      return;
    }

    // 保存原始预览，再拉全量
    parent._previewChildren = parent.children;
    this.setData({ expandingId: rootId });
    try {
      const res = await get('/api/comment/', { comment_id: rootId }, { loading: false });
      const children = Array.isArray(res) ? res : (res.results || []);
      parent.children = children;
      parent._expanded = true;
      this.setData({ commentTree: tree, expandingId: null });
    } catch (err) {
      this.setData({ expandingId: null });
    }
  },

  // ══════════════════════ 加载更多一级评论 ══════════════════════

  async onLoadMoreComments() {
    if (this.data.commentLoading || this.data.commentNomore) return;
    this.setData({ commentLoading: true });
    try {
      const res = await get('/api/comment/', {
        news_id: this.data.detail.id,
        min_id: this.data.commentMinId
      }, { loading: false });
      const more = res.results || [];
      if (more.length > 0) {
        more.forEach(c => { c._expanded = false; });
        const tree = this.data.commentTree.concat(more);
        this.setData({
          commentTree: tree,
          commentMinId: more[more.length - 1].id,
          commentNomore: more.length < 10
        });
      } else {
        this.setData({ commentNomore: true });
      }
    } catch (err) {
      console.error('[加载更多评论] 失败:', err);
    }
    this.setData({ commentLoading: false });
  },

  // ══════════════════════ 发布评论 ══════════════════════

  async onPostComment() {
    const text = this.data.commentText.trim();
    if (!text) return;

    const body = {
      news: this.data.detail.id,
      content: text,
      depth: this.data.replyId ? 2 : 1,
      reply: this.data.replyId || null,
      root: this.data.rootId || null
    };

    try {
      const res = await post('/api/comment/', body);
      const tree = [...this.data.commentTree];
      const newComment = { ...res, children: [], _expanded: false };

      if (this.data.rootId) {
        // 有 root → 回复的是一级或子评论 → 追加到根评论的 children
        const root = tree.find(c => c.id === this.data.rootId);
        if (root) {
          if (!root.children) root.children = [];
          root.children.push(newComment);
          root._expanded = true;
        }
      } else {
        // 无 root → 一级评论 → 插入列表顶部
        tree.unshift(newComment);
      }

      this.setData({
        commentTree: tree,
        commentText: '',
        replyTo: '',
        replyId: null,
        rootId: null,
        comment_count: this.data.comment_count + 1
      });

      wx.showToast({ title: '评论成功', icon: 'none' });
    } catch (err) {
      wx.showToast({ title: '评论失败', icon: 'none' });
    }
  }
})
