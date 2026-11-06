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

function mediaUrl(value) {
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    const fileName = String(value).split(/[\\/]/).pop();
    return fileName ? IMAGE_BASE + fileName : '';
}

Page({
    data: {
        StatusBar: app.globalData.StatusBar,
        CustomBar: app.globalData.CustomBar,
        loading: true,
        errorMsg: '',
        reservation: {},
        spot: {},
        category: {},
        user: {},
        verifications: [],
        statusName: '',
        statusClass: '',
        spotCover: '',
        qrUrl: '',
        qrError: false,
        canVerify: false
    },
    onLoad(options) {
        this.loadDetail(options.id || options.orderId)
    },
    loadDetail(id) {
        if (!id) {
            this.setData({ loading: false, errorMsg: '订单ID不能为空' })
            return
        }
        http.get('detail/' + id).then((r) => {
            const data = (r.data && (r.data.reservation || r.data.spot)) ? r.data : r;
            const reservation = data.reservation || {};
            const spot = data.spot || {};
            const category = data.category || {};
            const user = data.user || {};
            const verifications = Array.isArray(data.verifications) ? data.verifications : [];
            const status = Number(reservation.status);
            const meta = STATUS_MAP[status] || { name: '未知状态', cls: 'status-expired' };
            const coverFile = spot.images ? spot.images.split(',').filter(Boolean)[0] : '';
            const qrFile = data.qrCode || data.qrCodeUrl || data.qrPath ||
                reservation.qrCode ||
                (reservation.reservationNo ? reservation.reservationNo + '.png' : '');
            this.setData({
                loading: false,
                reservation: reservation,
                spot: spot,
                category: category,
                user: user,
                verifications: verifications,
                statusName: meta.name,
                statusClass: meta.cls,
                spotCover: mediaUrl(coverFile),
                qrUrl: mediaUrl(qrFile),
                qrError: false,
                canVerify: status === 0 || status === 1
            })
        })
    },
    onQrError() {
        this.setData({ qrError: true })
    },
    previewQr() {
        if (!this.data.qrUrl || this.data.qrError) return
        wx.previewImage({
            current: this.data.qrUrl,
            urls: [this.data.qrUrl]
        })
    }
});
