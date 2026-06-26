Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    selectedDate: {
      type: String,
      value: ''
    }
  },

  data: {
    currentYear: 2024,
    currentMonth: 1,
    days: [],
    today: '',
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    festivals: {
      '01-01': '元旦',
      '01-28': '春节',
      '01-29': '春节',
      '01-30': '春节',
      '01-31': '春节',
      '02-01': '春节',
      '02-02': '春节',
      '02-03': '春节',
      '02-14': '情人节',
      '03-08': '妇女节',
      '03-12': '植树节',
      '04-01': '愚人节',
      '04-04': '清明节',
      '05-01': '劳动节',
      '05-04': '青年节',
      '05-12': '护士节',
      '06-01': '儿童节',
      '06-22': '端午节',
      '06-23': '端午节',
      '06-24': '端午节',
      '07-01': '建党节',
      '08-01': '建军节',
      '09-10': '教师节',
      '09-17': '中秋节',
      '09-18': '中秋节',
      '09-19': '中秋节',
      '10-01': '国庆节',
      '10-02': '国庆节',
      '10-03': '国庆节',
      '10-04': '国庆节',
      '10-05': '国庆节',
      '10-06': '国庆节',
      '10-07': '国庆节',
      '12-25': '圣诞节'
    }
  },

  lifetimes: {
    attached: function() {
      const today = new Date()
      this.setData({
        currentYear: today.getFullYear(),
        currentMonth: today.getMonth() + 1,
        today: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      })
      this.generateDays()
    }
  },

  observers: {
    'show': function(val) {
      if (val) {
        this.generateDays()
      }
    },
    'currentYear, currentMonth': function() {
      this.generateDays()
    }
  },

  methods: {
    generateDays: function() {
      const year = this.data.currentYear
      const month = this.data.currentMonth
      const firstDay = new Date(year, month - 1, 1)
      const lastDay = new Date(year, month, 0)
      const daysCount = lastDay.getDate()
      const startWeekDay = firstDay.getDay()

      const days = []
      
      for (let i = 0; i < startWeekDay; i++) {
        days.push({ empty: true })
      }

      for (let i = 1; i <= daysCount; i++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`
        const weekDay = new Date(year, month - 1, i).getDay()
        const monthDay = `${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`
        const festival = this.data.festivals[monthDay]
        
        days.push({
          day: i,
          date: dateStr,
          isToday: dateStr === this.data.today,
          isWeekend: weekDay === 0 || weekDay === 6,
          isSelected: dateStr === this.properties.selectedDate,
          festival: festival,
          weekDay: weekDay
        })
      }

      this.setData({ days: days })
    },

    prevMonth: function() {
      let year = this.data.currentYear
      let month = this.data.currentMonth - 1
      if (month < 1) {
        month = 12
        year--
      }
      this.setData({ currentYear: year, currentMonth: month })
    },

    nextMonth: function() {
      let year = this.data.currentYear
      let month = this.data.currentMonth + 1
      if (month > 12) {
        month = 1
        year++
      }
      this.setData({ currentYear: year, currentMonth: month })
    },

    selectDate: function(e) {
      const date = e.currentTarget.dataset.date
      if (!date) return
      
      this.triggerEvent('select', { date: date })
    },

    close: function() {
      this.triggerEvent('close')
    },

    stopPropagation: function() {
      // 阻止事件冒泡
    },

    getWeekDayClass: function(weekDay) {
      if (weekDay === 0) return 'weekend-sunday'
      if (weekDay === 6) return 'weekend-saturday'
      return ''
    }
  }
})