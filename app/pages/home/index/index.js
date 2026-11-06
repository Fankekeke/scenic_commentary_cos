const app = getApp();
let http = require('../../../utils/request')

const IMAGE_BASE = 'http://127.0.0.1:9527/imagesWeb/';
const DEFAULT_ICON = '/img/user.png';
const DEFAULT_CENTER = { latitude: 30.2489, longitude: 120.1485 };
const LOCATION_INTERVAL = 15000;
const AUDIO_QUERY_INTERVAL = 30000;
const SIM_MARKER_ID = 999999;

function formatDate(date) {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return year + '-' + month + '-' + day;
}

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
        latitude: DEFAULT_CENTER.latitude,
        longitude: DEFAULT_CENTER.longitude,
        scale: 13,
        markers: [],
        includePoints: [],
        categoryList: [],
        activeCategory: 0,
        spotCount: 0,
        loading: true,
        selectedSpot: null,
        isPlaying: false,
        location: null,
        locationText: '',
        isSimulated: false,
        autoAudio: null,
        autoPlaying: false,
        routeSpots: [],
        polyline: [],
        routeInfo: null,
        showReservation: false,
        today: formatDate(new Date()),
        timeSlots: ['08:00-12:00', '12:00-18:00'],
        timeSlotIndex: 0,
        reservation: {
            visitDate: formatDate(new Date()),
            visitTimeSlot: '08:00-12:00',
            visitorCount: 1,
            contactName: '',
            contactMobile: '',
            remark: ''
        }
    },
    onLoad() {
        this.spots = [];
        this.spotsLoaded = false;
        this.categoryMap = {};
        this.categoryList = [];
        this.loadCategories();
        this.loadSpots();
        this.startLocation();
        this.startAudioTimer();
    },
    onShow() {
        if (!this.locationWatching) {
            this.startLocation();
        }
        this.startAudioTimer();
    },
    onHide() {
        this.stopAudio();
        this.stopAutoAudio();
        this.stopLocation();
        this.stopAudioTimer();
    },
    onUnload() {
        this.stopLocation();
        this.stopAudioTimer();
        if (this.audioContext) {
            this.audioContext.stop();
            this.audioContext.destroy();
            this.audioContext = null;
        }
        if (this.autoAudioContext) {
            this.autoAudioContext.stop();
            this.autoAudioContext.destroy();
            this.autoAudioContext = null;
        }
    },
    loadCategories() {
        http.get('enabled-scenic-category').then((r) => {
            const list = Array.isArray(r.data) ? r.data : [];
            Promise.all(list.map(item => this.resolveIcon(item.iconUrl))).then(paths => {
                const categoryMap = {};
                const categoryList = list.map((item, index) => {
                    categoryMap[item.id] = {
                        name: item.name,
                        iconPath: paths[index]
                    };
                    return {
                        id: item.id,
                        name: item.name,
                        iconPath: paths[index],
                        hasIcon: !!item.iconUrl
                    };
                });
                this.categoryMap = categoryMap;
                this.categoryList = categoryList;
                this.buildMarkers();
            });
        });
    },
    loadSpots() {
        http.get('on-shelf-scenic').then((r) => {
            this.spots = Array.isArray(r.data) ? r.data : [];
            this.spotsLoaded = true;
            this.buildMarkers();
        });
    },
    resolveIcon(iconUrl) {
        return new Promise(resolve => {
            if (!iconUrl) {
                resolve(DEFAULT_ICON);
                return;
            }
            const src = /^https?:\/\//i.test(iconUrl) ? iconUrl : IMAGE_BASE + iconUrl;
            wx.getImageInfo({
                src: src,
                success: res => resolve(res.path),
                fail: () => resolve(DEFAULT_ICON)
            });
        });
    },
    buildMarkers() {
        const allSpots = this.spots.map(spot => {
            const category = this.categoryMap[spot.categoryId] || {};
            const categoryName = String(spot.categoryName || category.name || '').trim();
            const isScenic = categoryName === '景区';
            const cover = spot.images ? spot.images.split(',').filter(Boolean)[0] : '';
            const audio = spot.audioMediaUrl || '';
            return Object.assign({}, spot, {
                categoryName: category.name || '未分类',
                categoryIcon: category.iconPath || DEFAULT_ICON,
                cover: cover ? IMAGE_BASE + cover : '',
                audioUrl: audio ? (/^https?:\/\//i.test(audio) ? audio : IMAGE_BASE + audio) : '',
                canReserve: !!spot.id && String(spot.status) === '1' && isScenic
            });
        });
        this.allSpots = allSpots;
        this.setData({
            categoryList: this.categoryList,
            loading: !this.spotsLoaded
        });
        this.applyFilter(this.data.activeCategory);
    },
    applyFilter(categoryId) {
        const spots = categoryId === 0
            ? this.allSpots
            : this.allSpots.filter(spot => String(spot.categoryId) === String(categoryId));
        const markers = spots.map(spot => ({
            id: spot.id,
            latitude: Number(spot.latitude),
            longitude: Number(spot.longitude),
            iconPath: spot.categoryIcon,
            width: 36,
            height: 36,
            callout: {
                content: spot.name,
                display: 'ALWAYS',
                padding: 8,
                borderRadius: 6,
                bgColor: '#ffffff',
                color: '#1f2d3d',
                fontSize: 12,
                textAlign: 'center'
            }
        }));
        const points = spots
            .filter(spot => spot.latitude && spot.longitude)
            .map(spot => ({ latitude: Number(spot.latitude), longitude: Number(spot.longitude) }));
        const center = points.length ? {
            latitude: points.reduce((sum, point) => sum + point.latitude, 0) / points.length,
            longitude: points.reduce((sum, point) => sum + point.longitude, 0) / points.length
        } : DEFAULT_CENTER;
        const allMarkers = this.simulatedMarker
            ? markers.concat([this.simulatedMarker])
            : markers;
        this.setData({
            activeCategory: categoryId,
            markers: allMarkers,
            includePoints: points.length ? points : [DEFAULT_CENTER],
            latitude: center.latitude,
            longitude: center.longitude,
            spotCount: spots.length,
            selectedSpot: null
        });
    },
    onCategoryTap(e) {
        this.applyFilter(Number(e.currentTarget.dataset.id));
    },
    onMarkerTap(e) {
        this.lastMarkerTap = Date.now();
        const markerId = e.detail.markerId !== undefined ? e.detail.markerId : e.markerId;
        const spot = this.allSpots.filter(item => String(item.id) === String(markerId))[0];
        if (!spot) return;
        this.stopAudio();
        const inRoute = (this.data.routeSpots || []).some(item => String(item.id) === String(spot.id));
        this.setData({
            selectedSpot: Object.assign({}, spot, { inRoute: inRoute }),
            showReservation: false
        });
        this.addRouteSpot(spot);
    },
    addRouteSpot(spot) {
        const selected = this.data.routeSpots || [];
        if (selected.some(item => String(item.id) === String(spot.id))) return;
        const next = selected.concat([{
            id: spot.id,
            name: spot.name,
            latitude: Number(spot.latitude),
            longitude: Number(spot.longitude)
        }]);
        this.setData({ routeSpots: next, polyline: [], routeInfo: null });
        wx.showToast({ title: '已加入路径（' + next.length + '）', icon: 'none' });
    },
    removeRouteSpot(e) {
        this.removeRouteSpotById(e.currentTarget.dataset.id);
    },
    removeRouteSpotById(id) {
        const next = (this.data.routeSpots || []).filter(item => String(item.id) !== String(id));
        this.setData({ routeSpots: next, polyline: [], routeInfo: null });
    },
    clearRoute() {
        this.setData({ routeSpots: [], polyline: [], routeInfo: null });
    },
    toggleCurrentRouteSpot() {
        const spot = this.data.selectedSpot;
        if (!spot) return;
        const selected = this.data.routeSpots || [];
        if (selected.some(item => String(item.id) === String(spot.id))) {
            this.removeRouteSpotById(spot.id);
            this.setData({ 'selectedSpot.inRoute': false });
        } else {
            this.addRouteSpot(spot);
            this.setData({ 'selectedSpot.inRoute': true });
        }
    },
    startRoutePlan() {
        const spots = this.data.routeSpots || [];
        if (!spots.length) {
            wx.showToast({ title: '请先点击景点加入路径', icon: 'none' });
            return;
        }
        const location = this.data.location;
        if (!location) {
            wx.showToast({ title: '正在获取当前位置', icon: 'none' });
            this.locateOnce();
            return;
        }
        const query = spots.map(item => 'ids=' + encodeURIComponent(item.id)).join('&');
        const url = 'route-plan?longitude=' + location.longitude +
            '&latitude=' + location.latitude + '&' + query;
        http.get(url, {}, true).then((r) => {
            const result = (r.data && (r.data.scenicSpots || r.data.route)) ? r.data : r;
            const ordered = Array.isArray(result.scenicSpots) ? result.scenicSpots : [];
            const route = result.route || {};
            const legs = Array.isArray(route.legs) ? route.legs : [];
            const points = [{ latitude: location.latitude, longitude: location.longitude }];
            legs.forEach(leg => {
                if (Array.isArray(leg.polyline)) {
                    leg.polyline.forEach(point => {
                        const latitude = Number(point.latitude);
                        const longitude = Number(point.longitude);
                        if (latitude && longitude) {
                            points.push({ latitude: latitude, longitude: longitude });
                        }
                    });
                }
                const target = ordered.filter(item => String(item.id) === String(leg.toId))[0];
                if (target) {
                    points.push({
                        latitude: Number(target.latitude),
                        longitude: Number(target.longitude)
                    });
                }
            });
            if (points.length === 1) {
                ordered.forEach(item => points.push({
                    latitude: Number(item.latitude),
                    longitude: Number(item.longitude)
                }));
            }
            const totalDistance = Number(route.totalDistance) || 0;
            const totalDuration = Number(route.totalDuration) || 0;
            const routeInfo = {
                orderText: ordered.length
                    ? ordered.map(item => item.visitNo + '. ' + item.name).join(' → ')
                    : '暂无路线',
                distanceText: totalDistance >= 1000
                    ? (totalDistance / 1000).toFixed(1) + ' km'
                    : totalDistance + ' 米',
                durationText: Math.ceil(totalDuration / 60) + ' 分钟',
                estimated: !!route.estimated
            };
            const markers = this.data.markers.map(marker => {
                const target = ordered.filter(item => String(item.id) === String(marker.id))[0];
                if (!target) return marker;
                return Object.assign({}, marker, {
                    callout: Object.assign({}, marker.callout, {
                        content: target.visitNo + '. ' + target.name
                    })
                });
            });
            this.setData({
                markers: markers,
                polyline: [{
                    points: points,
                    color: '#0081ff',
                    width: 6,
                    dottedLine: !!route.estimated,
                    arrowLine: true
                }],
                routeInfo: routeInfo
            });
            if (points.length > 1) {
                wx.createMapContext('scenicMap').includePoints({
                    points: points,
                    padding: [100, 40, 100, 40]
                });
            }
        });
    },
    onMapTap(e) {
        if (Date.now() - (this.lastMarkerTap || 0) < 600) return;
        const latitude = Number(e.detail.latitude);
        const longitude = Number(e.detail.longitude);
        if (!latitude || !longitude) {
            wx.showToast({ title: '无法获取点击位置', icon: 'none' });
            return;
        }
        this.simulatedLocation = { latitude, longitude };
        this.simulatedMarker = {
            id: SIM_MARKER_ID,
            latitude: latitude,
            longitude: longitude,
            iconPath: DEFAULT_ICON,
            width: 36,
            height: 36,
            callout: {
                content: '模拟位置',
                display: 'ALWAYS',
                padding: 8,
                borderRadius: 6,
                bgColor: '#0081ff',
                color: '#ffffff',
                fontSize: 12,
                textAlign: 'center'
            }
        };
        const markers = this.data.markers.filter(item => item.id !== SIM_MARKER_ID);
        this.setData({
            location: this.simulatedLocation,
            locationText: longitude.toFixed(6) + ', ' + latitude.toFixed(6),
            isSimulated: true,
            markers: markers.concat([this.simulatedMarker])
        });
        this.lastAutoSpotId = null;
        this.queryAutoAudio(longitude, latitude);
    },
    clearSimulatedLocation() {
        if (!this.simulatedLocation) return;
        this.simulatedLocation = null;
        this.simulatedMarker = null;
        this.lastAutoSpotId = null;
        this.hasQueried = false;
        this.setData({
            isSimulated: false,
            markers: this.data.markers.filter(item => item.id !== SIM_MARKER_ID)
        });
        this.locateOnce();
    },
    closeDetail() {
        this.stopAudio();
        this.setData({ selectedSpot: null, showReservation: false });
    },
    toggleAudio() {
        const spot = this.data.selectedSpot;
        const url = spot && spot.audioUrl;
        if (!url) {
            wx.showToast({ title: '暂无讲解音频', icon: 'none' });
            return;
        }
        if (this.data.isPlaying) {
            this.stopAudio();
            return;
        }
        if (this.data.autoPlaying) {
            this.stopAutoAudio();
        }
        if (!this.audioContext) {
            this.audioContext = wx.createInnerAudioContext();
            this.audioContext.onEnded(() => this.setData({ isPlaying: false }));
            this.audioContext.onError(() => {
                this.setData({ isPlaying: false });
                wx.showToast({ title: '音频加载失败', icon: 'none' });
            });
        }
        this.audioContext.src = url;
        this.audioContext.play();
        this.setData({ isPlaying: true });
    },
    stopAudio() {
        if (this.audioContext) {
            this.audioContext.stop();
        }
        this.setData({ isPlaying: false });
    },
    startLocation() {
        if (this.locationWatching) return;
        this.locationWatching = true;
        const handler = res => this.onLocationChange(res);
        this.locationHandler = handler;
        if (wx.startLocationUpdate && wx.onLocationChange) {
            wx.startLocationUpdate({
                type: 'gcj02',
                success: () => {
                    this.locationUpdateStarted = true;
                    wx.onLocationChange(handler);
                    this.locateOnce();
                },
                fail: () => this.fallbackLocate()
            });
        } else {
            this.fallbackLocate();
        }
    },
    fallbackLocate() {
        this.locateOnce();
        if (!this.locationTimer) {
            this.locationTimer = setInterval(() => this.locateOnce(), LOCATION_INTERVAL);
        }
    },
    locateOnce() {
        wx.getLocation({
            type: 'gcj02',
            success: res => this.onLocationChange(res),
            fail: () => {
                if (!this.locationDenied) {
                    this.locationDenied = true;
                    wx.showToast({ title: '请授权位置权限', icon: 'none' });
                }
                this.stopLocation();
            }
        });
    },
    stopLocation() {
        if (this.locationTimer) {
            clearInterval(this.locationTimer);
            this.locationTimer = null;
        }
        if (this.locationHandler && wx.offLocationChange) {
            wx.offLocationChange(this.locationHandler);
            this.locationHandler = null;
        }
        if (this.locationUpdateStarted && wx.stopLocationUpdate) {
            wx.stopLocationUpdate();
            this.locationUpdateStarted = false;
        }
        this.locationWatching = false;
    },
    startAudioTimer() {
        if (this.audioQueryTimer) return;
        this.audioQueryTimer = setInterval(() => {
            const location = this.data.location;
            if (!location) return;
            this.queryAutoAudio(location.longitude, location.latitude);
        }, AUDIO_QUERY_INTERVAL);
    },
    stopAudioTimer() {
        if (this.audioQueryTimer) {
            clearInterval(this.audioQueryTimer);
            this.audioQueryTimer = null;
        }
    },
    onLocationChange(res) {
        if (this.simulatedLocation) return;
        const latitude = Number(res.latitude);
        const longitude = Number(res.longitude);
        if (!latitude || !longitude) return;
        const text = longitude.toFixed(6) + ', ' + latitude.toFixed(6);
        if (this.data.locationText !== text) {
            this.setData({
                location: { latitude, longitude },
                locationText: text
            });
        }
        if (!this.hasQueried) {
            this.hasQueried = true;
            this.queryAutoAudio(longitude, latitude);
        }
    },
    queryAutoAudio(longitude, latitude) {
        http.get('auto-guide-audio', { longitude, latitude }, false).then((r) => {
            const data = r.data;
            const audio = data && typeof data === 'object' &&
                (data.audioUrl || data.audioFileName || data.audioMediaUrl)
                ? data
                : ((r.audioUrl || r.audioFileName || r.audioMediaUrl) ? r : null);
            if (!audio) {
                this.lastAutoSpotId = null;
                if (this.data.autoPlaying || this.data.autoAudio) {
                    this.stopAutoAudio();
                }
                return;
            }
            if (this.lastAutoSpotId === audio.id) return;
            if (!mediaUrl(audio.audioUrl || audio.audioMediaUrl || audio.audioFileName)) return;
            this.lastAutoSpotId = audio.id;
            this.playAutoAudio(audio);
        });
    },
    playAutoAudio(audio) {
        const url = mediaUrl(audio.audioUrl || audio.audioMediaUrl || audio.audioFileName);
        if (!url) return;
        this.stopAudio();
        if (!this.autoAudioContext) {
            this.autoAudioContext = wx.createInnerAudioContext();
            this.autoAudioContext.onEnded(() => this.setData({ autoPlaying: false }));
            this.autoAudioContext.onError(() => {
                this.setData({ autoPlaying: false });
                wx.showToast({ title: '讲解音频加载失败', icon: 'none' });
            });
        }
        this.autoAudioContext.src = url;
        this.autoAudioContext.play();
        this.setData({
            autoAudio: {
                title: audio.audioTitle || audio.name || '景点讲解',
                distance: audio.distance || 0,
                radius: audio.triggerRadiusM || 0
            },
            autoPlaying: true
        });
    },
    stopAutoAudio() {
        if (this.autoAudioContext) {
            this.autoAudioContext.stop();
        }
        this.setData({ autoPlaying: false, autoAudio: null });
    },
    moveToCurrent() {
        const location = this.data.location;
        if (!location) {
            wx.showToast({ title: '正在获取当前位置', icon: 'none' });
            this.locateOnce();
            return;
        }
        wx.createMapContext('scenicMap').moveToLocation({
            latitude: location.latitude,
            longitude: location.longitude
        });
    },
    isReservableSpot() {
        const spot = this.data.selectedSpot;
        if (!spot || !spot.canReserve || !spot.id) return false;
        return this.allSpots
            ? this.allSpots.some(item => String(item.id) === String(spot.id))
            : false;
    },
    openReservation() {
        if (!this.isReservableSpot()) {
            wx.showToast({ title: '该点位暂不支持预约', icon: 'none' });
            return;
        }
        const cache = wx.getStorageSync('userInfo');
        if (!cache || !cache.id) {
            wx.showToast({ title: '请先登录', icon: 'none' });
            return;
        }
        this.userId = cache.id;
        this.stopAudio();
        this.setData({
            showReservation: true,
            timeSlotIndex: 0,
            reservation: {
                visitDate: this.data.today,
                visitTimeSlot: this.data.timeSlots[0],
                visitorCount: 1,
                contactName: cache.realName || cache.nickname || '',
                contactMobile: cache.mobile || '',
                remark: ''
            }
        });
    },
    closeReservation() {
        this.setData({ showReservation: false });
    },
    onReserveInput(e) {
        this.setData({
            ['reservation.' + e.currentTarget.dataset.field]: e.detail.value
        });
    },
    onDateChange(e) {
        this.setData({ 'reservation.visitDate': e.detail.value });
    },
    onSlotChange(e) {
        const index = Number(e.detail.value);
        this.setData({
            timeSlotIndex: index,
            'reservation.visitTimeSlot': this.data.timeSlots[index]
        });
    },
    submitReservation() {
        const spot = this.data.selectedSpot;
        const reservation = this.data.reservation;
        if (!this.isReservableSpot()) {
            wx.showToast({ title: '该点位暂不支持预约', icon: 'none' });
            return;
        }
        if (!this.userId) {
            wx.showToast({ title: '请先登录', icon: 'none' });
            return;
        }
        const contactName = (reservation.contactName || '').trim();
        const contactMobile = (reservation.contactMobile || '').trim();
        const visitorCount = Number(reservation.visitorCount);
        if (!reservation.visitDate || !reservation.visitTimeSlot) {
            wx.showToast({ title: '请选择游览日期和时段', icon: 'none' });
            return;
        }
        if (!visitorCount || visitorCount < 1) {
            wx.showToast({ title: '预约人数至少为 1', icon: 'none' });
            return;
        }
        if (!contactName) {
            wx.showToast({ title: '请填写联系人', icon: 'none' });
            return;
        }
        if (!/^1[3-9]\d{9}$/.test(contactMobile)) {
            wx.showToast({ title: '手机号格式不正确', icon: 'none' });
            return;
        }
        const params = {
            userId: this.userId,
            spotId: spot.id,
            visitDate: reservation.visitDate,
            visitTimeSlot: reservation.visitTimeSlot,
            visitorCount: visitorCount,
            contactName: contactName,
            contactMobile: contactMobile
        };
        const remark = (reservation.remark || '').trim();
        if (remark) {
            params.remark = remark;
        }
        http.postForm('scenic-reservation', params).then((r) => {
            this.setData({ showReservation: false });
            const no = r.data && r.data.reservationNo;
            if (no) {
                wx.showModal({
                    title: '预约成功',
                    content: '预约单号：' + no,
                    showCancel: false
                });
            } else {
                wx.showToast({ title: '预约成功', icon: 'success' });
            }
        });
    },
    resetView() {
        const points = this.data.includePoints;
        if (!points.length) return;
        wx.createMapContext('scenicMap').includePoints({
            points: points,
            padding: [80, 40, 80, 40]
        });
    },
    navigateToSpot() {
        const spot = this.data.selectedSpot;
        if (!spot) return;
        wx.openLocation({
            latitude: Number(spot.latitude),
            longitude: Number(spot.longitude),
            name: spot.name || '景区位置',
            address: spot.address || '',
            scale: 16
        });
    }
});
