const app = getApp();
let http = require('../../../utils/request')

Page({
    data: {
        StatusBar: app.globalData.StatusBar,
        CustomBar: app.globalData.CustomBar,
        TabbarBot: app.globalData.tabbar_bottom,
        isLogin: false,
        form: {
            id: null,
            avatarUrl: '',
            nickname: '',
            mobile: '',
            realName: '',
            idCard: ''
        }
    },
    onLoad() {
        this.loadUserInfo()
    },
    loadUserInfo() {
        const cache = wx.getStorageSync('userInfo')
        if (!cache || !cache.id) {
            this.setData({ isLogin: false })
            wx.showToast({
                title: '请先进行登录',
                icon: 'none',
                duration: 2000
            })
            return
        }
        this.setData({ isLogin: true })
        this.fillForm(cache)
        http.get('userInfo', { userId: cache.id }).then((r) => {
            this.fillForm(r.data || cache)
        })
    },
    fillForm(user) {
        this.setData({
            form: {
                id: user.id,
                avatarUrl: user.avatarUrl || '',
                nickname: user.nickname || '',
                mobile: user.mobile || '',
                realName: user.realName || '',
                idCard: user.idCard || ''
            }
        })
    },
    onInput(e) {
        this.setData({
            ['form.' + e.currentTarget.dataset.field]: e.detail.value
        })
    },
    goLogin() {
        wx.switchTab({ url: '/pages/user/index/index' })
    },
    save() {
        const form = this.data.form
        if (!form.id) {
            wx.showToast({ title: '请先进行登录', icon: 'none' })
            return
        }
        const nickname = (form.nickname || '').trim()
        const mobile = (form.mobile || '').trim()
        const realName = (form.realName || '').trim()
        const idCard = (form.idCard || '').trim()
        if (!nickname) {
            wx.showToast({ title: '昵称不能为空', icon: 'none' })
            return
        }
        if (mobile && !/^1[3-9]\d{9}$/.test(mobile)) {
            wx.showToast({ title: '手机号格式不正确', icon: 'none' })
            return
        }
        if (idCard && !/(^\d{15}$)|(^\d{17}[\dXx]$)/.test(idCard)) {
            wx.showToast({ title: '身份证号格式不正确', icon: 'none' })
            return
        }
        http.postForm('userUpdate', {
            id: form.id,
            nickname: nickname,
            mobile: mobile,
            realName: realName,
            idCard: idCard
        }).then((r) => {
            const user = Object.assign({}, form, r.data || {})
            wx.setStorageSync('userInfo', user)
            app.globalData.userInfo = user
            this.fillForm(user)
            wx.showToast({ title: '保存成功', icon: 'success' })
        })
    }
});
