package cc.mrbird.febs.common.utils;

import cn.hutool.http.HttpUtil;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;

/**
 * 滴滴地图（滴图）步行路径规划工具类
 * <p>
 * 接口文档：https://lbs.xiaojukeji.com
 * walkroute 接口以 origin / destination 查询参数接收单段起终点，不支持 packs 批量；
 * packs 批量属于驾车接口 routeplanv3。因此多段路线需逐段调用。
 * 坐标系为 GCJ-02（火星坐标系）。
 *
 * @author FanK @公众号 悲伤的橘子森林 @邮箱 fan1ke2ke@gmail.com
 */
@Slf4j
@Component
public class DiDiRouteUtils {

    /**
     * 滴滴地图开放平台步行路径规划接口
     */
    private static final String ROUTE_PLAN_API_URL = "https://lbs.xiaojukeji.com/api/v2/walkroute";

    /**
     * 接口成功状态码
     */
    private static final int SUCCESS_STATUS = 10000;

    /**
     * 请求超时时间，单位毫秒
     */
    private static final int TIMEOUT = 5000;

    /**
     * 滴滴地图开放平台 KEY，在 application.yml 中通过 didi.lbs.key 配置
     */
    @Value("${didi.lbs.key:}")
    private String key;

    /**
     * 是否已配置滴滴地图 KEY
     *
     * @return true 已配置
     */
    public boolean isEnabled() {
        return key != null && !key.trim().isEmpty();
    }

    /**
     * 批量步行路径规划
     * <p>
     * walkroute 接口不支持 packs 批量，每段行程单独发起一次请求；
     * 单段失败时该段返回 null，由调用方按直线距离降级处理。
     *
     * @param legs 起终点集合，每个元素为 {起点坐标, 终点坐标}，坐标格式为 "经度,纬度"（GCJ-02）
     * @return 路线结果集合，与入参顺序一致；某一段规划失败时对应元素为 null，由调用方降级处理
     */
    public List<RouteResult> walkingRoutePlan(List<String[]> legs) {
        List<RouteResult> routeResults = new ArrayList<>();
        for (int i = 0; i < legs.size(); i++) {
            routeResults.add(null);
        }
        if (!isEnabled() || legs.isEmpty()) {
            return routeResults;
        }
        for (int i = 0; i < legs.size(); i++) {
            String[] leg = legs.get(i);
            if (leg == null || leg.length < 2 || leg[0] == null || leg[1] == null) {
                continue;
            }
            try {
                // walkroute 只接受 key / origin / destination，不能传 packs
                String url = ROUTE_PLAN_API_URL + "?key=" + URLEncoder.encode(key, StandardCharsets.UTF_8.name())
                        + "&origin=" + URLEncoder.encode(leg[0], StandardCharsets.UTF_8.name())
                        + "&destination=" + URLEncoder.encode(leg[1], StandardCharsets.UTF_8.name());
                String response = HttpUtil.get(url, TIMEOUT);
                log.debug("滴滴路径规划接口响应：{}", response);
                JSONObject responseJson = JSONUtil.parseObj(response);
                Integer status = responseJson.getInt("status");
                if (status != null && status != SUCCESS_STATUS) {
                    log.warn("滴滴路径规划接口调用失败，状态码：{}，信息：{}，原因：{}",
                            status, responseJson.getStr("msg"), responseJson.getStr("results"));
                    continue;
                }
                JSONArray resultsJson = responseJson.getJSONArray("results");
                if (resultsJson == null || resultsJson.isEmpty()) {
                    log.warn("滴滴路径规划接口返回结果为空");
                    continue;
                }
                JSONObject resultJson = resultsJson.getJSONObject(0);
                if (resultJson == null) {
                    continue;
                }
                Integer errcode = resultJson.getInt("errcode");
                if (errcode != null && errcode != 0) {
                    log.warn("滴滴路径规划单段路线返回错误，错误码：{}，信息：{}",
                            errcode, resultJson.getStr("errmsg"));
                    continue;
                }
                // walkroute 的 results[] 元素本身即路线；兼容 routeplanv3 的 results[].routes[] 结构
                JSONArray routesJson = resultJson.getJSONArray("routes");
                JSONObject routeJson = routesJson != null && !routesJson.isEmpty()
                        ? routesJson.getJSONObject(0) : resultJson;
                if (routeJson != null) {
                    routeResults.set(i, parseRoute(routeJson));
                }
            } catch (Exception e) {
                log.error("滴滴路径规划接口调用异常", e);
            }
        }
        return routeResults;
    }

    /**
     * 解析单段路线信息
     * <p>
     * 不同出行方式返回的距离、耗时、坐标字段名不一致，这里做兼容处理
     *
     * @param routeJson 路线 JSON 对象
     * @return 路线结果
     */
    private RouteResult parseRoute(JSONObject routeJson) {
        RouteResult routeResult = new RouteResult();
        routeResult.setDistance(firstInteger(routeJson, "dist", "walk_distance", "distance"));
        routeResult.setDuration(firstInteger(routeJson, "duration", "walk_duration"));
        routeResult.setPolyline(parsePolyline(routeJson.get("geo_list") != null ? routeJson.get("geo_list") : routeJson.get("polyline")));
        return routeResult;
    }

    /**
     * 按顺序读取第一个存在的整型字段
     *
     * @param jsonObject JSON 对象
     * @param keys       字段名，按优先级排列
     * @return 字段值，都不存在时返回 null
     */
    private Integer firstInteger(JSONObject jsonObject, String... keys) {
        for (String key : keys) {
            Integer value = jsonObject.getInt(key);
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    /**
     * 解析路线坐标串
     * <p>
     * 兼容数组（元素为 {longitude, latitude} 对象或 "经度,纬度" 字符串）与字符串（"经度,纬度;经度,纬度"）两种格式
     *
     * @param polylineObject 坐标串
     * @return 坐标点集合，元素为 {longitude, latitude}
     */
    private List<LinkedHashMap<String, Object>> parsePolyline(Object polylineObject) {
        List<LinkedHashMap<String, Object>> polyline = new ArrayList<>();
        if (polylineObject == null) {
            return polyline;
        }
        if (polylineObject instanceof String) {
            for (String point : ((String) polylineObject).split(";")) {
                addPoint(polyline, point);
            }
        } else if (polylineObject instanceof JSONArray) {
            for (Object item : (JSONArray) polylineObject) {
                if (item instanceof JSONObject) {
                    JSONObject geo = (JSONObject) item;
                    addPoint(polyline, geo.getStr("longitude"), geo.getStr("latitude"));
                } else if (item instanceof String) {
                    addPoint(polyline, (String) item);
                }
            }
        }
        return polyline;
    }

    /**
     * 添加坐标点
     *
     * @param polyline 坐标点集合
     * @param point    "经度,纬度" 格式的坐标
     */
    private void addPoint(List<LinkedHashMap<String, Object>> polyline, String point) {
        if (point == null) {
            return;
        }
        String[] longitudeLatitude = point.split(",");
        if (longitudeLatitude.length < 2) {
            return;
        }
        addPoint(polyline, longitudeLatitude[0], longitudeLatitude[1]);
    }

    /**
     * 添加坐标点
     *
     * @param polyline  坐标点集合
     * @param longitude 经度
     * @param latitude  纬度
     */
    private void addPoint(List<LinkedHashMap<String, Object>> polyline, String longitude, String latitude) {
        if (longitude == null || latitude == null) {
            return;
        }
        LinkedHashMap<String, Object> point = new LinkedHashMap<>();
        point.put("longitude", longitude);
        point.put("latitude", latitude);
        polyline.add(point);
    }

    /**
     * 单段路线结果
     */
    @Data
    public static class RouteResult {

        /**
         * 距离，单位米
         */
        private Integer distance;

        /**
         * 耗时，单位秒
         */
        private Integer duration;

        /**
         * 路线坐标串，元素为 {longitude, latitude}（GCJ-02）
         */
        private List<LinkedHashMap<String, Object>> polyline;
    }
}
