package cc.mrbird.febs.common.utils;

import java.util.Arrays;

/**
 * 路径规划算法工具类
 * <p>
 * 用于求解「从起点出发，经过多个途经点，怎样走总路程最短」的最优访问顺序。
 * 途经点数量不超过 {@link #EXACT_ALGORITHM_MAX_POINTS} 时使用 Held-Karp 动态规划精确求解；
 * 超过时使用最近邻算法构造初始解，再用 2-opt 局部优化，兼顾效果与性能。
 *
 * @author FanK @公众号 悲伤的橘子森林 @邮箱 fan1ke2ke@gmail.com
 */
public class RoutePlanUtils {

    /**
     * 精确算法（Held-Karp）适用的最大途经点数量
     */
    private static final int EXACT_ALGORITHM_MAX_POINTS = 12;

    /**
     * 浮点误差精度
     */
    private static final double EPSILON = 1e-9;

    private RoutePlanUtils() {

    }

    /**
     * 计算从起点出发，经过所有途经点的最短访问顺序
     *
     * @param distanceMatrix 距离矩阵，索引 0 为起点，其余为途经点
     * @return 途经点的访问顺序，元素为距离矩阵中的索引（不含起点 0）
     */
    public static int[] optimizeOrder(double[][] distanceMatrix) {
        int pointCount = distanceMatrix.length - 1;
        if (pointCount <= 1) {
            int[] order = new int[Math.max(pointCount, 0)];
            for (int i = 0; i < order.length; i++) {
                order[i] = i + 1;
            }
            return order;
        }
        if (pointCount <= EXACT_ALGORITHM_MAX_POINTS) {
            return heldKarp(distanceMatrix);
        }
        return twoOpt(nearestNeighbor(distanceMatrix), distanceMatrix);
    }

    /**
     * 最近邻算法：每次前往距离当前位置最近的未访问途经点
     *
     * @param distanceMatrix 距离矩阵
     * @return 初始访问顺序
     */
    private static int[] nearestNeighbor(double[][] distanceMatrix) {
        int pointCount = distanceMatrix.length;
        boolean[] visited = new boolean[pointCount];
        visited[0] = true;
        int[] route = new int[pointCount - 1];
        int current = 0;
        for (int i = 0; i < route.length; i++) {
            int nearest = -1;
            double minDistance = Double.MAX_VALUE;
            for (int j = 1; j < pointCount; j++) {
                if (!visited[j] && distanceMatrix[current][j] < minDistance) {
                    minDistance = distanceMatrix[current][j];
                    nearest = j;
                }
            }
            visited[nearest] = true;
            route[i] = nearest;
            current = nearest;
        }
        return route;
    }

    /**
     * 2-opt 局部优化：反复反转路径片段，直到总路程无法继续减少
     *
     * @param route           初始访问顺序
     * @param distanceMatrix 距离矩阵
     * @return 优化后的访问顺序
     */
    private static int[] twoOpt(int[] route, double[][] distanceMatrix) {
        int pointCount = route.length;
        if (pointCount < 3) {
            return route;
        }
        boolean improved = true;
        while (improved) {
            improved = false;
            for (int i = 0; i < pointCount - 1; i++) {
                for (int j = i + 1; j < pointCount; j++) {
                    // 路径为开放式，起点固定为 0，终点后无后续节点
                    int previous = i == 0 ? 0 : route[i - 1];
                    boolean isLast = j == pointCount - 1;
                    double currentDistance = distanceMatrix[previous][route[i]] + (isLast ? 0 : distanceMatrix[route[j]][route[j + 1]]);
                    double newDistance = distanceMatrix[previous][route[j]] + (isLast ? 0 : distanceMatrix[route[i]][route[j + 1]]);
                    if (newDistance < currentDistance - EPSILON) {
                        reverse(route, i, j);
                        improved = true;
                    }
                }
            }
        }
        return route;
    }

    /**
     * Held-Karp 动态规划精确求解最短访问顺序
     * <p>
     * dp[mask][i] 表示从起点出发，已访问途经点集合为 mask，当前位于途经点 i 的最短路程
     *
     * @param distanceMatrix 距离矩阵
     * @return 最优访问顺序
     */
    private static int[] heldKarp(double[][] distanceMatrix) {
        int pointCount = distanceMatrix.length - 1;
        int maskCount = 1 << pointCount;
        double[][] dp = new double[maskCount][pointCount];
        int[][] parent = new int[maskCount][pointCount];
        for (double[] row : dp) {
            Arrays.fill(row, Double.MAX_VALUE);
        }
        for (int i = 0; i < pointCount; i++) {
            dp[1 << i][i] = distanceMatrix[0][i + 1];
            parent[1 << i][i] = -1;
        }
        for (int mask = 1; mask < maskCount; mask++) {
            for (int i = 0; i < pointCount; i++) {
                if ((mask & (1 << i)) == 0 || dp[mask][i] == Double.MAX_VALUE) {
                    continue;
                }
                for (int j = 0; j < pointCount; j++) {
                    if ((mask & (1 << j)) != 0) {
                        continue;
                    }
                    int nextMask = mask | (1 << j);
                    double candidate = dp[mask][i] + distanceMatrix[i + 1][j + 1];
                    if (candidate < dp[nextMask][j]) {
                        dp[nextMask][j] = candidate;
                        parent[nextMask][j] = i;
                    }
                }
            }
        }
        int fullMask = maskCount - 1;
        int last = -1;
        double minDistance = Double.MAX_VALUE;
        for (int i = 0; i < pointCount; i++) {
            if (dp[fullMask][i] < minDistance) {
                minDistance = dp[fullMask][i];
                last = i;
            }
        }
        // 根据父节点指针逆序还原访问顺序
        int[] order = new int[pointCount];
        int mask = fullMask;
        int index = 0;
        while (last != -1) {
            order[index++] = last + 1;
            int previous = parent[mask][last];
            mask ^= 1 << last;
            last = previous;
        }
        reverse(order, 0, pointCount - 1);
        return order;
    }

    /**
     * 反转数组指定区间
     *
     * @param array 数组
     * @param start 起始索引
     * @param end   结束索引
     */
    private static void reverse(int[] array, int start, int end) {
        while (start < end) {
            int temp = array[start];
            array[start] = array[end];
            array[end] = temp;
            start++;
            end--;
        }
    }
}
