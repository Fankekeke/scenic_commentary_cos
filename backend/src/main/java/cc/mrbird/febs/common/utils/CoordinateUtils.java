package cc.mrbird.febs.common.utils;

/**
 * 经纬度坐标工具类
 * <p>
 * 坐标系说明：
 * WGS-84：GPS 国际标准坐标（谷歌地球、iOS 原生定位）
 * GCJ-02：火星坐标系（高德、腾讯地图、微信小程序定位）
 * BD-09：百度坐标系（百度地图）
 *
 * @author FanK @公众号 悲伤的橘子森林 @邮箱 fan1ke2ke@gmail.com
 */
public class CoordinateUtils {

    /**
     * 地球平均半径，单位米
     */
    private static final double EARTH_RADIUS = 6371393.0;

    /**
     * 百度坐标系偏移量：经度
     */
    private static final double BD_LNG_OFFSET = 0.0065;

    /**
     * 百度坐标系偏移量：纬度
     */
    private static final double BD_LAT_OFFSET = 0.006;

    /**
     * 圆周率
     */
    private static final double PI = Math.PI;

    /**
     * 百度坐标转换辅助常量：PI * 3000.0 / 180.0
     */
    private static final double X_PI = PI * 3000.0 / 180.0;

    private CoordinateUtils() {

    }

    /**
     * GCJ-02（火星坐标系）转 BD-09（百度坐标系）
     *
     * @param lng 经度
     * @param lat 纬度
     * @return 转换后的经纬度，[0] 为经度，[1] 为纬度
     */
    public static double[] gcj02ToBd09(double lng, double lat) {
        double z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * X_PI);
        double theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * X_PI);
        return new double[]{z * Math.cos(theta) + BD_LNG_OFFSET, z * Math.sin(theta) + BD_LAT_OFFSET};
    }

    /**
     * BD-09（百度坐标系）转 GCJ-02（火星坐标系）
     *
     * @param lng 经度
     * @param lat 纬度
     * @return 转换后的经纬度，[0] 为经度，[1] 为纬度
     */
    public static double[] bd09ToGcj02(double lng, double lat) {
        double x = lng - BD_LNG_OFFSET;
        double y = lat - BD_LAT_OFFSET;
        double z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * X_PI);
        double theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * X_PI);
        return new double[]{z * Math.cos(theta), z * Math.sin(theta)};
    }

    /**
     * 使用 Haversine 公式计算两个经纬度之间的球面距离
     *
     * @param lng1 第一个点的经度
     * @param lat1 第一个点的纬度
     * @param lng2 第二个点的经度
     * @param lat2 第二个点的纬度
     * @return 两点之间的距离，单位米
     */
    public static double distance(double lng1, double lat1, double lng2, double lat2) {
        double radLat1 = lat1 * PI / 180.0;
        double radLat2 = lat2 * PI / 180.0;
        double a = radLat1 - radLat2;
        double b = lng1 * PI / 180.0 - lng2 * PI / 180.0;
        double s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2)
                + Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)));
        return s * EARTH_RADIUS;
    }
}
