// pages/detail/detail.js - 动态详情
const { get, post } = require('../../utils/request');
var app = getApp();

Page({
  data: {
    detail: {},
    commentTree: [],
    commentText: '',
    replyTo: '',
    replyId: null,
    rootId: null,
    loading: true,
    rootLoading: false,
    rootNomore: false,
    rootMinId: null,
    isFavor: false,
    favorCount: 0,
    favorLoading: false,
    isLoggedIn: false
  },

  onLoad(options) {
    if (options.id) this.fetchDetail(options.id);
  },

  onShow() {
    this.setData({ isLoggedIn: app.isLoggedIn() });
  },

  /* ══════════════════════ 初始化 ══════════════════════ */

  async fetchDetail(id) {
    this.setData({ loading: true });
    try {
      const res = await get('/api/news/' + id, {}, { loading: false });
      const colors = ['#E8836E','#F0A060','#8EB8D0','#88C888','#B6915A','#60B8A0','#7E8DC8','#A888D0'];
      const tree = res.comment ? Object.values(res.comment) : [];
      tree.forEach(c => this._initRoot(c));
      this.setData({
        detail: {
          ...res,
          _avatarChar: res.user ? res.user.nickname[0] : '?',
          _avatarBg: colors[(res.user ? res.user.id : 0) % colors.length]
        },
        commentTree: tree,
        loading: false,
        comment_count: res.comment_count || 0,
        rootMinId: tree.length > 0 ? tree[tree.length - 1].id : null,
        rootNomore: tree.length < 10,
        isFavor: res.is_favor || false,
        favorCount: res.favor_count || 0
      });
    } catch (err) {
      console.error('[详情]', err);
      this.setData({ loading: false });
    }
  },

  /**
   * 初始化一条根评论：挂载预览子评论、重置分页状态
   * c.children —— 详情 API 预装的 0~1 条子评论（缺 reply_id / reply__user__nickname）
   * c._preview —— 缓存预装子评论，展开时用于与 API 数据合并
   * c._flat   —— API 拉回的全量扁平子评论（去重后），用于重建嵌套树
   */
  _initRoot(c) {
    c._isFavor = c.is_favor || false;
    c._preview = (c.children || []).map(function (ch) {
      ch._isFavor = ch.is_favor || false;
      ch.children = ch.children || [];
      return ch;
    });
    c._flat = [];
    c._childMinId = null;
    c._childNomore = false;
    c._childLoading = false;
    c._expanded = c._preview.length > 0;
    c.children = c._expanded ? c._preview.slice() : [];
  },

  /* ══════════════════════ 根评论展开 / 收起 ══════════════════════ */

  async onExpandChildren(e) {
    var rootId = Number(e.currentTarget.dataset.id);
    var tree = this.data.commentTree;
    var root = tree.find(function (c) { return c.id == rootId; });
    if (!root || root._childLoading) return;

    // 收起
    if (root._expanded) {
      root._expanded = false;
      root.children = [];
      this.setData({ commentTree: tree });
      return;
    }

    // 展开 → CommentView
    root._childLoading = true;
    this.setData({ commentTree: tree });
    try {
      var resp = await get('/api/comment/', { comment_id: rootId }, { loading: false });
      var page = resp.results || [];

      // 合并 + 去重 + 排序（API 数据优先，补齐 reply_id）
      var merged = this._dedupe(root._preview, page);
      root._flat = merged;
      root.children = this._makeTree(merged);
      root._expanded = true;
      root._childMinId = merged.length > 0 ? merged[merged.length - 1].id : null;
      root._childNomore = page.length < 10;
    } catch (err) {
      console.error('[子评论]', err);
    }
    root._childLoading = false;
    this.setData({ commentTree: tree });
  },

  /* ══════════════════════ 加载更多子评论 ══════════════════════ */

  async onLoadMoreChildren(e) {
    var rootId = Number(e.currentTarget.dataset.id);
    var tree = this.data.commentTree;
    var root = tree.find(function (c) { return c.id == rootId; });
    if (!root || root._childLoading || root._childNomore || !root._childMinId) return;

    root._childLoading = true;
    this.setData({ commentTree: tree });
    try {
      var resp = await get('/api/comment/', { comment_id: rootId, min_id: root._childMinId }, { loading: false });
      var page = resp.results || [];
      if (page.length > 0) {
        var merged = this._dedupe(root._flat, page);
        root._flat = merged;
        root.children = this._makeTree(merged);
        root._childMinId = merged[merged.length - 1].id;
        root._childNomore = page.length < 10;
      } else {
        root._childNomore = true;
      }
    } catch (err) {
      console.error('[更多子评论]', err);
    }
    root._childLoading = false;
    this.setData({ commentTree: tree });
  },

  /* ══════════════════════ 加载更多根评论 ══════════════════════ */

  async onLoadMoreComments() {
    if (this.data.rootLoading || this.data.rootNomore) return;
    this.setData({ rootLoading: true });
    try {
      var resp = await get('/api/comment/', {
        news_id: this.data.detail.id,
        min_id: this.data.rootMinId
      }, { loading: false });
      var more = resp.results || [];
      if (more.length > 0) {
        more.forEach(function (c) { this._initRoot(c); }, this);
        var tree = this.data.commentTree.concat(more);
        this.setData({
          commentTree: tree,
          rootMinId: more[more.length - 1].id,
          rootNomore: more.length < 10
        });
      } else {
        this.setData({ rootNomore: true });
      }
    } catch (err) {
      console.error('[更多评论]', err);
    }
    this.setData({ rootLoading: false });
  },

  /* ══════════════════════ 工具：去重合并 + 建树 ══════════════════════ */

  /**
   * a = 预装子评论（缺 reply_id），b = API 子评论（字段全）
   * 按 id 去重，API 数据优先；最终按 id 降序排列
   */
  _dedupe: function (a, b) {
    var map = {};
    for (var i = 0; i < a.length; i++) { map[a[i].id] = a[i]; }
    for (var j = 0; j < b.length; j++) {
      var c = b[j];
      c._isFavor = c.is_favor || false;
      map[c.id] = c;
    }
    var arr = [];
    for (var k in map) { arr.push(map[k]); }
    arr.sort(function (x, y) { return y.id - x.id; });
    return arr;
  },

  /**
   * 扁平数组 → 嵌套树：c.reply_id 在同一数组中找父级，找不到则留在顶层
   * 返回顶层节点数组，每个节点 .children 递归持有后代
   */
  _makeTree: function (flat) {
    var map = {};
    for (var i = 0; i < flat.length; i++) {
      var c = flat[i];
      c.children = [];
      map[c.id] = c;
    }
    var roots = [];
    for (var j = 0; j < flat.length; j++) {
      var item = flat[j];
      if (item.reply_id != null && map[item.reply_id]) {
        map[item.reply_id].children.push(item);
      } else {
        roots.push(item);
      }
    }
    return roots;
  },

  /* ══════════════════════ 发布评论 ══════════════════════ */

  async onPostComment() {
    var text = this.data.commentText.trim();
    if (!text || !app.requireLogin()) return;

    try {
      var resp = await post('/api/comment/', {
        news: this.data.detail.id,
        content: text,
        depth: this.data.replyId ? 2 : 1,
        reply: this.data.replyId || null,
        root: this.data.rootId || null
      });
      var tree = this.data.commentTree.slice();
      var nc = { id: resp.id, content: resp.content, user__nickname: resp.user__nickname,
        user__avatar: resp.user__avatar || '', create_date: resp.create_date,
        depth: resp.depth, favor_count: 0, is_favor: false, reply_id: resp.reply_id || null,
        reply__user__nickname: resp.reply__user__nickname || null,
        children: [], _isFavor: false };

      if (this.data.rootId) {
        var rt = tree.find(function (c) { return c.id == this.data.rootId; }, this);
        if (rt) {
          rt._flat.push(nc);
          rt._flat.sort(function (x, y) { return y.id - x.id; });
          rt.children = this._makeTree(rt._flat);
          rt._expanded = true;
        }
      } else {
        this._initRoot({ id: nc.id, content: nc.content, user__nickname: nc.user__nickname,
          user__avatar: nc.user__avatar, create_date: nc.create_date,
          depth: nc.depth, favor_count: 0, is_favor: false,
          reply_id: null, reply__user__nickname: null, children: [] });
        tree.unshift(nc);
      }

      this.setData({
        commentTree: tree,
        commentText: '', replyTo: '', replyId: null, rootId: null,
        comment_count: this.data.comment_count + 1
      });
      wx.showToast({ title: '评论成功', icon: 'none' });
    } catch (err) {
      if (err.message !== 'UNAUTHORIZED') { wx.showToast({ title: '评论失败', icon: 'none' }); }
    }
  },

  /* ══════════════════════ 点赞 ══════════════════════ */

  async onToggleFavor() {
    if (!app.requireLogin() || this.data.favorLoading) return;
    var nid = this.data.detail.id, was = this.data.isFavor;
    this.setData({ isFavor: !was, favorCount: was ? Math.max(0, this.data.favorCount - 1) : this.data.favorCount + 1, favorLoading: true });
    try {
      var r = await post('/api/favor/', { news: nid }, { loading: false });
      this.setData({ isFavor: r.is_favor, favorCount: r.favor_count, favorLoading: false });
      wx.showToast({ title: r.is_favor ? '点赞成功' : '已取消点赞', icon: 'none', duration: 1000 });
    } catch (err) {
      if (err.message !== 'UNAUTHORIZED') {
        this.setData({ isFavor: was, favorCount: was ? this.data.favorCount + 1 : Math.max(0, this.data.favorCount - 1), favorLoading: false });
      } else { this.setData({ favorLoading: false }); }
    }
  },

  async onToggleCommentFavor(e) {
    if (!app.requireLogin()) return;
    var cid = Number(e.currentTarget.dataset.id);
    try {
      var r = await post('/api/comment/favor/', { comment: cid }, { loading: false });
      wx.showToast({ title: r.is_favor ? '点赞成功' : '已取消点赞', icon: 'none', duration: 1000 });
      this._updateFavor(cid, r.favor_count, r.is_favor);
    } catch (err) {
      if (err.message !== 'UNAUTHORIZED') { wx.showToast({ title: '操作失败', icon: 'none' }); }
    }
  },

  _updateFavor: function (cid, count, val) {
    var tree = this.data.commentTree.map(function (root) {
      if (root.id == cid) return Object.assign({}, root, { favor_count: count, _isFavor: val });
      var useFlat = root._flat.length > 0;
      var list = useFlat ? root._flat : root._preview;
      if (!list.length) return root;
      var updated = list.map(function (c) { return c.id == cid ? Object.assign({}, c, { favor_count: count, _isFavor: val }) : c; });
      var nr = Object.assign({}, root);
      nr[useFlat ? '_flat' : '_preview'] = updated;
      nr.children = useFlat ? this._makeTree(updated) : updated.slice();
      return nr;
    }, this);
    this.setData({ commentTree: tree });
  },

  /* ══════════════════════ 其他 ══════════════════════ */

  onShareAppMessage: function () {
    var d = this.data.detail;
    return {
      title: d.content ? d.content.substr(0, 30) : '快来看看这条动态',
      path: '/pages/detail/detail?id=' + d.id,
      imageUrl: d.imageList && d.imageList.length > 0 ? d.imageList[0].cos_path : ''
    };
  },

  onPreviewImage: function (e) {
    var src = e.currentTarget.dataset.src;
    wx.previewImage({ current: src, urls: this.data.detail.imageList.map(function (i) { return i.cos_path; }) });
  },

  onCommentInput: function (e) {
    if (!app.isLoggedIn()) { wx.showToast({ title: '登录后才能评论', icon: 'none' }); return; }
    this.setData({ commentText: e.detail.value });
  },

  onReply: function (e) {
    if (!app.requireLogin()) return;
    this.setData({
      replyTo: e.currentTarget.dataset.name,
      replyId: Number(e.currentTarget.dataset.id),
      rootId: Number(e.currentTarget.dataset.root) || Number(e.currentTarget.dataset.id),
      commentText: ''
    });
  },

  onCancelReply: function () {
    this.setData({ replyTo: '', replyId: null, rootId: null, commentText: '' });
  },

  onCommentTap: function () {
    if (!app.requireLogin()) return;
  }
})
