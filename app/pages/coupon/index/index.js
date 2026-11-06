const app = getApp();
let http = require('../../../utils/request')
const IMAGE_BASE = 'http://127.0.0.1:9527/imagesWeb/';
const TYPE_MAP = { '1': '通知公告', '2': '活动预告' };

Page({
    data: {
        StatusBar: app.globalData.StatusBar,
        CustomBar: app.globalData.CustomBar,
        TabbarBot: app.globalData.tabbar_bottom,
        bulletinList: [],
        loading: true,
        isEmpty: false
    },
    onShow() {
        this.getBulletinList()
    },
    getBulletinList() {
        http.get('getBulletinList').then((r) => {
            const list = Array.isArray(r.data) ? r.data : [];
            list.forEach(item => {
                item.imagesList = item.images ? item.images.split(',').filter(Boolean) : [];
                item.cover = item.imagesList.length ? IMAGE_BASE + item.imagesList[0] : '';
                item.typeName = TYPE_MAP[item.type] || '景区公告';
                item.publisherName = item.publisher || '景区官方';
                item.dateText = item.createDate ? item.createDate.substring(0, 16) : '';
            });
            this.setData({
                bulletinList: list,
                isEmpty: list.length === 0,
                loading: false
            })
        })
    },
    bulletinDetail(event) {
        wx.navigateTo({
            url: '/pages/coupon/detail/index?id=' + event.currentTarget.dataset.id
        });
    }
});
