const app = getApp();
let http = require('../../../utils/request')
const IMAGE_BASE = 'http://127.0.0.1:9527/imagesWeb/';
const TYPE_MAP = { '1': '通知公告', '2': '活动预告' };

Page({
  data: {
    StatusBar: app.globalData.StatusBar,
    CustomBar: app.globalData.CustomBar,
    TabbarBot: app.globalData.tabbar_bottom,
    bulletin: null,
    imagesList: [],
    loading: true
  },
  onLoad: function (options) {
    this.getBulletinDetail(options.id || options.postId)
  },
  getBulletinDetail(id) {
    if (!id) {
      this.setData({ loading: false })
      wx.showToast({ title: '公告不存在', icon: 'none' })
      return
    }
    http.get('getBulletinList').then((r) => {
      const list = Array.isArray(r.data) ? r.data : [];
      const item = list.filter(b => String(b.id) === String(id))[0];
      if (!item) {
        this.setData({ loading: false })
        wx.showToast({ title: '公告不存在或已下架', icon: 'none' })
        return
      }
      item.typeName = TYPE_MAP[item.type] || '景区公告';
      item.publisherName = item.publisher || '景区官方';
      const imagesList = item.images
        ? item.images.split(',').filter(Boolean).map(name => IMAGE_BASE + name)
        : [];
      this.setData({ bulletin: item, imagesList: imagesList, loading: false })
    })
  },
  previewImage(event) {
    wx.previewImage({
      current: event.currentTarget.dataset.src,
      urls: this.data.imagesList
    })
  }
});
