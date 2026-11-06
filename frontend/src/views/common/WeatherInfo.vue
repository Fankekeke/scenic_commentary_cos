<template>
  <div class="weather-info-wrapper">
    <a-spin :spinning="loading">
      <a-card class="weather-card" :bordered="false">
        <div v-if="cityInfo" class="weather-now">
          <div class="weather-now-head">
            <span class="weather-city">{{ cityInfo.city }}</span>
            <span class="weather-parent">{{ cityInfo.parent }}</span>
          </div>
          <div class="weather-now-body">
            <div class="weather-temp">
              <span class="temp-num">{{ data.wendu }}</span>
              <span class="temp-unit">℃</span>
            </div>
            <div class="weather-type">{{ today.type }}</div>
          </div>
          <div class="weather-meta">
            <span>{{ today.fx }} {{ today.fl }}</span>
            <span>{{ data.shidu }} 湿度</span>
          </div>
          <div class="weather-air">
            <a-tag :color="qualityColor">{{ data.quality }}</a-tag>
            <span>PM2.5: {{ data.pm25 }}</span>
            <span>PM10: {{ data.pm10 }}</span>
          </div>
          <div class="weather-ganmao">{{ data.ganmao }}</div>
          <div class="weather-update">更新于 {{ cityInfo.updateTime }}</div>
        </div>
        <a-divider orientation="left" class="weather-divider">未来天气</a-divider>
        <div class="weather-forecast">
          <div class="forecast-item" v-for="(item, index) in forecast" :key="item.ymd"
               :class="{ 'forecast-today': index === 0 }">
            <div class="forecast-date">{{ item.ymd.slice(5) }}</div>
            <div class="forecast-week">{{ item.week }}</div>
            <div class="forecast-type">{{ item.type }}</div>
            <div class="forecast-temp">{{ item.low.replace('低温 ', '') }} ~ {{ item.high.replace('高温 ', '') }}</div>
            <div class="forecast-wind">{{ item.fx }} {{ item.fl }}</div>
          </div>
        </div>
      </a-card>
    </a-spin>
  </div>
</template>

<script>
export default {
  name: 'WeatherInfo',
  data () {
    return {
      loading: false,
      cityInfo: null,
      data: {
        shidu: '',
        pm25: '',
        pm10: '',
        quality: '',
        wendu: '',
        ganmao: '',
        forecast: []
      }
    }
  },
  computed: {
    today () {
      return this.data.forecast && this.data.forecast.length ? this.data.forecast[0] : {}
    },
    forecast () {
      return (this.data.forecast || []).slice(0, 6)
    },
    qualityColor () {
      const map = {
        '优': 'green',
        '良': 'blue',
        '轻度污染': 'orange',
        '中度污染': 'orange',
        '重度污染': 'red',
        '严重污染': 'red'
      }
      return map[this.data.quality] || 'blue'
    }
  },
  mounted () {
    this.fetchWeather()
  },
  methods: {
    fetchWeather () {
      this.loading = true
      this.$get('/cos/weather-info/queryWeatherByCityCode/101010300').then((r) => {
        const res = r.data.data
        this.cityInfo = res.cityInfo
        this.data = res.data
        this.loading = false
      }).catch(() => {
        this.loading = false
        this.$message.error('获取天气信息失败')
      })
    }
  }
}
</script>

<style lang="less" scoped>
.weather-info-wrapper {
  .weather-card {
    height: 100%;
    .weather-now {
      .weather-now-head {
        .weather-city {
          font-size: 1.2rem;
          font-weight: 600;
        }
        .weather-parent {
          color: rgba(0, 0, 0, 0.45);
          font-size: .8rem;
          margin-left: .4rem;
        }
      }
      .weather-now-body {
        display: flex;
        align-items: baseline;
        margin: .4rem 0;
        .weather-temp {
          .temp-num {
            font-size: 2.6rem;
            font-weight: 700;
            line-height: 1;
          }
          .temp-unit {
            font-size: 1.2rem;
            margin-left: .2rem;
          }
        }
        .weather-type {
          margin-left: 1rem;
          font-size: 1rem;
          color: rgba(0, 0, 0, 0.65);
        }
      }
      .weather-meta {
        display: flex;
        justify-content: space-between;
        color: rgba(0, 0, 0, 0.45);
        font-size: .8rem;
        margin-bottom: .4rem;
      }
      .weather-air {
        display: flex;
        align-items: center;
        span {
          margin-left: .8rem;
          font-size: .8rem;
          color: rgba(0, 0, 0, 0.65);
        }
      }
      .weather-ganmao {
        margin-top: .5rem;
        font-size: .8rem;
        color: rgba(0, 0, 0, 0.45);
      }
      .weather-update {
        margin-top: .3rem;
        font-size: .7rem;
        color: rgba(0, 0, 0, 0.35);
      }
    }
    .weather-divider {
      margin: .8rem 0 .5rem;
    }
    .weather-forecast {
      display: flex;
      flex-wrap: wrap;
      .forecast-item {
        flex: 1;
        min-width: 14%;
        text-align: center;
        padding: .3rem .2rem;
        border-radius: 4px;
        .forecast-date {
          font-size: .75rem;
          color: rgba(0, 0, 0, 0.45);
        }
        .forecast-week {
          font-size: .8rem;
          font-weight: 600;
          margin: .1rem 0;
        }
        .forecast-type {
          font-size: .8rem;
          color: #4a9ff5;
        }
        .forecast-temp {
          font-size: .7rem;
          color: rgba(0, 0, 0, 0.65);
          margin: .1rem 0;
        }
        .forecast-wind {
          font-size: .65rem;
          color: rgba(0, 0, 0, 0.45);
        }
        &.forecast-today {
          background-color: #e6f7ff;
        }
      }
    }
  }
}
</style>
