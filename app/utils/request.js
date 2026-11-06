/**
 * 请求相关的封装
 */
let baseUrl = "http://127.0.0.1:9527/cos/web/"; // 接口地址
let header = {
  'content-type': 'application/x-www-form-urlencoded',
  'content-type': 'application/json;charset=utf-8',
  'Authorization': "Bearer " + wx.getStorageSync("token")
}
/**
 * 封装请求
 */
function fetch(options) {
  if (options.loading) {
    wx.showLoading({
      title: '加载中',
      mask: true
    })
  }
  return new Promise((resolve, reject) => {
    wx.request({
      url: baseUrl + options.url,
      data: options.data,
      header: options.header || header,
      method: options.method,
      success: function(res) {
        if (options.loading) {
          wx.hideLoading()
        }

        if (res.data.code == 1) {
          // 重新登陆
          return false;
        }
        if (res.data.code != 0) {
          wx.showToast({
            title: res.data.msg || '请求失败',
            mask: "true",
            icon: 'none',
            duration: 1000
          })
          return;
        }
        resolve(res.data); //把请求到的数据发到引用请求的地方
      },
      fail: function(err) {
        if (options.loading) {
          wx.hideLoading()
        }
        wx.showToast({
          title: "网络连接超时",
          icon: 'none',
          duration: 1000,
        })
      }
    })
  })
}
/**
 * POST 请求
 */
export function post(url, params, loading = true) {
  var option = {
    url: url,
    data: params,
    method: 'POST',
    loading
  }
  return fetch(option);
}

/**
 * POST 表单请求（application/x-www-form-urlencoded）
 * 用于后端以实体对象接收、未标注 @RequestBody 的接口
 */
export function postForm(url, params, loading = true) {
  var body = Object.keys(params)
    .filter(function (key) { return params[key] !== undefined && params[key] !== null })
    .map(function (key) { return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]) })
    .join('&');
  var option = {
    url: url,
    data: body,
    method: 'POST',
    header: Object.assign({}, header, {
      'content-type': 'application/x-www-form-urlencoded'
    }),
    loading
  }
  return fetch(option);
}

/**
 * GET请求
 */
export function get(urls, params, loading = true) {
  var option = {
    url: urls,
    data: params,
    method: 'GET',
    loading
  }
  return fetch(option);
}
