// pages/messages/messages.js - 消息中心
Page({
  data: {
    entries: [
      { id: 1, label: '赞和收藏', icon: '❤️', bg: '#FFF0F0', badge: 6 },
      { id: 2, label: '最近来访', icon: '👤', bg: '#F0F6FF', badge: 0 },
      { id: 3, label: '评论@',    icon: '💬', bg: '#F0FAFA', badge: 2 }
    ],
    messages: [
      {
        id: 1, title: '竞拍成功通知',
        preview: '恭喜您成功竞得"清乾隆·青花缠枝莲纹赏瓶"，请尽快完成支付',
        time: '今天 14:30', avatar: '拍', avatarBg: '#E8836E',
        accentColor: '#00B6B9', unread: true
      },
      {
        id: 2, title: '出价被超提醒',
        preview: '您在"徐悲鸿《奔马图》"的出价已被超过，当前价 ¥1,620,000',
        time: '今天 14:28', avatar: '价', avatarBg: '#F0A060',
        accentColor: '#00B6B9', unread: true
      },
      {
        id: 3, title: '账户安全提醒',
        preview: '您的账户于6月17日在新设备登录，如非本人操作请及时修改密码',
        time: '昨天 14:20', avatar: '安', avatarBg: '#D34166',
        accentColor: '#00B6B9', unread: true
      },
      {
        id: 4, title: '截拍提醒',
        preview: '您关注的"明代·和田白玉螭龙纹佩"将于明日10:00截拍',
        time: '昨天 10:00', avatar: '截', avatarBg: '#E07050',
        accentColor: '#00B6B9', unread: true
      },
      {
        id: 5, title: '保证金退款到账',
        preview: '您在Lot.5678的保证金 ¥10,000 已退回至您的账户余额',
        time: '06-16 18:05', avatar: '退', avatarBg: '#60B8A0',
        accentColor: '#00B6B9', unread: false
      },
      {
        id: 6, title: '平台服务升级公告',
        preview: 'Auaction平台将于6月20日凌晨2:00-4:00进行系统升级维护',
        time: '06-16 09:15', avatar: '公', avatarBg: '#8EB8D0',
        accentColor: '#00B6B9', unread: false
      },
      {
        id: 7, title: '藏家认证通过',
        preview: '恭喜！您的藏家认证已审核通过，即刻享受VIP专属权益',
        time: '06-14 16:48', avatar: '认', avatarBg: '#88C888',
        accentColor: '#00B6B9', unread: false
      }
    ]
  },
  onLoad() {
    wx.removeTabBarBadge({ index: 3 });
  }
})
