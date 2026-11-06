<template>
  <div class="home-statistics">
    <a-spin :spinning="loading" tip="加载中...">
      <a-row :gutter="16">
        <a-col :span="8">
          <weather-info/>
        </a-col>
        <a-col :span="8">
          <a-card title="近7天新增用户" class="stat-card" :bordered="false">
            <apexchart type="area" height="200" :options="newUserOptions" :series="newUserSeries"/>
          </a-card>
        </a-col>
        <a-col :span="8">
          <a-card title="近7天访问用户" class="stat-card" :bordered="false">
            <apexchart type="area" height="200" :options="visitOptions" :series="visitSeries"/>
          </a-card>
        </a-col>
        <a-col :span="8">
          <a-card title="近7天预约趋势" class="stat-card" :bordered="false">
            <apexchart type="area" height="200" :options="reservationOptions" :series="reservationSeries"/>
          </a-card>
        </a-col>
        <a-col :span="8">
          <a-card title="景点类型分布" class="stat-card" :bordered="false">
            <apexchart type="donut" height="200" :options="categoryOptions" :series="categorySeries"/>
          </a-card>
        </a-col>
        <a-col :span="8">
          <a-card title="各景点预约占比" class="stat-card" :bordered="false">
            <apexchart type="bar" height="200" :options="ratioOptions" :series="ratioSeries"/>
          </a-card>
        </a-col>
      </a-row>
    </a-spin>
  </div>
</template>

<script>
import WeatherInfo from '@/views/common/WeatherInfo'
export default {
  name: 'HomeStatistics',
  components: {WeatherInfo},
  data () {
    return {
      loading: false,
      statistics: {
        newUserTrend: [],
        userVisitTrend: [],
        scenicCategoryDistribution: [],
        reservationTrend: [],
        scenicReservationRatio: []
      }
    }
  },
  computed: {
    trendDate () {
      return (this.statistics.newUserTrend || []).map(item => item.date)
    },
    newUserSeries () {
      return [{
        name: '新增用户',
        data: (this.statistics.newUserTrend || []).map(item => item.count)
      }]
    },
    newUserOptions () {
      return {
        chart: { type: 'area', height: 280, toolbar: { show: false }, zoom: { enabled: false } },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2 },
        colors: ['#4a9ff5'],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.6, opacityTo: 0.1, stops: [0, 90, 100] } },
        xaxis: { categories: this.trendDate },
        tooltip: { y: { formatter: (val) => `${val} 人` } }
      }
    },
    visitSeries () {
      return [{
        name: '访问用户',
        data: (this.statistics.userVisitTrend || []).map(item => item.count)
      }]
    },
    visitOptions () {
      return {
        chart: { type: 'area', height: 280, toolbar: { show: false }, zoom: { enabled: false } },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2 },
        colors: ['#42b983'],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.6, opacityTo: 0.1, stops: [0, 90, 100] } },
        xaxis: { categories: this.trendDate },
        tooltip: { y: { formatter: (val) => `${val} 人` } }
      }
    },
    reservationSeries () {
      return [{
        name: '预约数',
        data: (this.statistics.reservationTrend || []).map(item => item.count)
      }]
    },
    reservationOptions () {
      return {
        chart: { type: 'area', height: 280, toolbar: { show: false }, zoom: { enabled: false } },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2 },
        colors: ['#f6c23e'],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.6, opacityTo: 0.1, stops: [0, 90, 100] } },
        xaxis: { categories: this.trendDate },
        tooltip: { y: { formatter: (val) => `${val} 单` } }
      }
    },
    categorySeries () {
      return (this.statistics.scenicCategoryDistribution || []).map(item => item.count)
    },
    categoryOptions () {
      return {
        chart: { type: 'donut', height: 280 },
        labels: (this.statistics.scenicCategoryDistribution || []).map(item => item.name),
        legend: { position: 'bottom' },
        dataLabels: { enabled: true, formatter: (val) => `${val.toFixed(1)}%` },
        responsive: [{ breakpoint: 480, options: { legend: { position: 'bottom' } } }]
      }
    },
    ratioSeries () {
      return [{
        name: '预约占比',
        data: (this.statistics.scenicReservationRatio || []).map(item => item.ratio)
      }]
    },
    ratioOptions () {
      return {
        chart: { type: 'bar', height: 320, toolbar: { show: false } },
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth: '45%',
            borderRadius: 4,
            distributed: true,
            dataLabels: { position: 'top' }
          }
        },
        dataLabels: { enabled: true, formatter: (val) => `${val}%`, offsetY: -20, style: { colors: ['#333'] } },
        colors: ['#4a9ff5', '#5cdbd3', '#f6c23e', '#e74a3b', '#858796'],
        xaxis: { categories: (this.statistics.scenicReservationRatio || []).map(item => item.name) },
        yaxis: { title: { text: '占比 (%)' } },
        legend: { show: false }
      }
    }
  },
  mounted () {
    this.fetchStatistics()
  },
  methods: {
    fetchStatistics () {
      this.loading = true
      this.$get('/cos/web/homepage-statistics').then((r) => {
        this.statistics = r.data
        this.loading = false
      }).catch(() => {
        this.loading = false
        this.$message.error('获取首页统计数据失败')
      })
    }
  }
}
</script>

<style lang="less" scoped>
.home-statistics {
  .stat-card {
    margin-bottom: 16px;
  }
}
</style>
