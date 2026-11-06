const app = getApp();
let http = require('../../../utils/request')

Page({
    data: {
        StatusBar: app.globalData.StatusBar,
        CustomBar: app.globalData.CustomBar,
        TabbarBot: app.globalData.tabbar_bottom,
        isLogin: false,
        userId: null,
        messageList: [],
        inputContent: '',
        scrollTop: 0
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
                messageList: [],
                inputContent: ''
            })
            wx.showToast({
                title: '请先登录',
                icon: 'none',
                duration: 2000
            })
            return
        }
        this.setData({ isLogin: true, userId: cache.id })
        this.loadHistory()
    },
    loadHistory() {
        http.get('history/' + this.data.userId).then((r) => {
            const list = Array.isArray(r.data) ? r.data : []
            list.forEach(item => {
                item.timeText = item.createdAt ? item.createdAt.substring(5, 16) : ''
            })
            this.setData({
                messageList: list,
                scrollTop: this.data.scrollTop + 100000
            })
        })
    },
    onInput(e) {
        this.setData({ inputContent: e.detail.value })
    },
    goLogin() {
        wx.switchTab({ url: '/pages/user/index/index' })
    },
    sendMessage() {
        if (!this.data.userId) {
            wx.showToast({ title: '请先登录', icon: 'none' })
            return
        }
        const content = (this.data.inputContent || '').trim()
        if (!content) {
            wx.showToast({ title: '请输入提问内容', icon: 'none' })
            return
        }
        http.postForm('addAiChatRecord', {
            sessionId: this.data.userId,
            content: content
        }).then(() => {
            this.setData({ inputContent: '' })
            this.loadHistory()
        })
    }
});
