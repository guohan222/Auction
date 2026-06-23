// pages/auction/auction.js - 拍卖页
Page({
  data: {
    categories: [
      { id: 1, name: '书画', icon: '🖌', color: '#F5E6D3' },
      { id: 2, name: '瓷器', icon: '🏺', color: '#D4E8EC' },
      { id: 3, name: '玉器', icon: '💎', color: '#E8F0E3' },
      { id: 4, name: '杂项', icon: '📦', color: '#F0E0E8' },
      { id: 5, name: '钱币', icon: '🪙', color: '#FDF0D5' }
    ],
    auctionList: [
      { id:1, name:'清乾隆 青花缠枝莲纹赏瓶', currentPrice:'280,000', bidCount:36, endTime:'今日 14:30', tags:['官窑','精品'], bgColor:'#E8E0D8' },
      { id:2, name:'徐悲鸿 《奔马图》设色纸本', currentPrice:'1,560,000', bidCount:52, endTime:'今日 16:00', tags:['名家','保真'], bgColor:'#D8DCE4' },
      { id:3, name:'明代 和田白玉螭龙纹佩', currentPrice:'95,000', bidCount:28, endTime:'明日 10:00', tags:['和田玉','明'], bgColor:'#E0E8DC' },
      { id:4, name:'光绪元宝 湖北省造 库平七钱二分', currentPrice:'12,500', bidCount:45, endTime:'今日 20:30', tags:['银元','评级'], bgColor:'#E8E4D8' },
      { id:5, name:'清中期 紫檀木雕花鸟纹笔筒', currentPrice:'68,000', bidCount:19, endTime:'明日 14:00', tags:['紫檀','文房'], bgColor:'#DCD8D0' }
    ]
  },
  onTapItem(e) {
    // 拍卖详情页暂未对接后端，预留入口
    wx.showToast({ title: '拍卖详情开发中', icon: 'none' });
  }
})
