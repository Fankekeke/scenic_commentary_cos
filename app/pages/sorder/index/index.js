const app = getApp();
let http = require('../../../utils/request')

const IMAGE_BASE = 'http://127.0.0.1:9527/imagesWeb/';
const STATUS_MAP = {
    0: { name: '待使用', cls: 'status-pending' },
    1: { name: '部分核销', cls: 'status-partial' },
    2: { name: '已核销', cls: 'status-used' },
    3: { name: '已取消', cls: 'status-canceled' },
    4: { name: '已过期', cls: 'status-expired' }
};

Page({
    data: {
        StatusBar: app.globalData.StatusBar,
        CustomBar: app.globalData.CustomBar,
        TabbarBot: app.globalData.tabbar_bottom,
        isLogin: false,
        userId: null,
        tabs: [
            { id: -1, name: '全部' },
            { id: 0, name: '待使用' },
            { id: 2, name: '已核销' },
            { id: 3, name: '已取消' },
            { id: 4, name: '已过期' }
        ],
        activeTab: -1,
        allOrders: [],
        orderList: [],
        loading: true
    },
    onShow() {
        this.checkLogin()
    },
    checkLogin() {
        const cache = wx.getStorageSync('userInfo')
        if (!cache || !cache.id) {
            this.setData({
                isLogin: false,
                userId: null,
                allOrders: [],
                orderList: [],
                loading: false
            })
            wx.showToast({
                title: '请先登录',
                icon: 'none',
                duration: 2000
            })
            return
        }
        this.setData({ isLogin: true, userId: cache.id, loading: true })
        this.loadOrders()
    },
    loadOrders() {
        http.get('byUser', { userId: this.data.userId }).then((r) => {
            const list = Array.isArray(r.data) ? r.data : [];
            const orders = list.map(order => {
                const status = Number(order.status);
                const meta = STATUS_MAP[status] || { name: '未知状态', cls: 'status-expired' };
                const cover = order.spotImages ? order.spotImages.split(',').filter(Boolean)[0] : '';
                return Object.assign({}, order, {
                    status: status,
                    statusName: meta.name,
                    statusClass: meta.cls,
                    canCancel: status === 0,
                    cover: cover ? IMAGE_BASE + cover : ''
                });
            });
            const activeTab = this.data.activeTab;
            const visible = activeTab === -1
                ? orders
                : orders.filter(order => order.status === activeTab);
            this.setData({
                allOrders: orders,
                orderList: visible,
                loading: false
            })
        })
    },
    applyFilter(status) {
        const list = status === -1
            ? this.data.allOrders
            : this.data.allOrders.filter(order => order.status === status);
        this.setData({ activeTab: status, orderList: list })
    },
    onTabTap(e) {
        this.applyFilter(Number(e.currentTarget.dataset.status))
    },
    openDetail(e) {
        wx.navigateTo({
            url: '/pages/sorder/details/index?id=' + e.currentTarget.dataset.id
        })
    },
    cancelOrder(e) {
        const id = e.currentTarget.dataset.id
        wx.showModal({
            title: '取消预约',
            content: '确定取消该预约吗？取消后不可恢复。',
            confirmColor: '#e54d42',
            success: (res) => {
                if (!res.confirm) return
                http.postForm('cancelReservation', {
                    id: id,
                    userId: this.data.userId
                }).then(() => {
                    wx.showToast({ title: '已取消', icon: 'success' })
                    this.loadOrders()
                })
            }
        })
    },
    goLogin() {
        wx.switchTab({ url: '/pages/user/index/index' })
    }
});
