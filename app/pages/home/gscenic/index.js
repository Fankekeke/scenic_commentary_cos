const app = getApp();
let http = require('../../../utils/request')
Page({
	data: {
		StatusBar: app.globalData.StatusBar,
		CustomBar: app.globalData.CustomBar,
		hidden: true,
		scenicInfo: null,
		shopList: [],
		quantity: 1
	},
	onLoad: function (option) {
		this.queryScenicDetail()
		this.queryEvaluateByScenicId()
	},
	shopDeatil(e) {
		wx.navigateTo({
			url: '/pages/shop/goods/details?scenicId='+e.currentTarget.dataset.shopid+''
		});
	},
	queryScenicDetail() {
		http.get('queryScenicDetail', {scenicId: 1}).then((r) => {
			console.log(r.data)
			this.setData({
				scenicInfo: r.data
			})
		})
	},
	queryEvaluateByScenicId() {
		http.get('queryEvaluateByScenicId', {scenicId: 1}).then((r) => {
			console.log(r.data)
			this.setData({
				shopList: r.data
			})
		})
	},

	getShopList() {
		http.get('scenicList').then((r) => {
			r.data.forEach(element => {
				element.image = element.images.split(',')[0]
			});
            this.setData({
                shopList: r.data
            })
        })
	}
});
