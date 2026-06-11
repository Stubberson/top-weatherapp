const queriedLocation = document.querySelector('input')
const button = document.querySelector('button')
const todayInfo = document.querySelector('.weather-information > .today')
const forecastInfo = document.querySelector('.weather-information > .forecast')

button.addEventListener('click', () => {
    while (todayInfo.children.length > 0) {  // Remove previous query
        todayInfo.lastChild.remove()
    }
    while (forecastInfo.children.length > 0) {
        forecastInfo.lastChild.remove()
    }

    let location = queriedLocation.value
    let weatherData = getData(location)
    weatherData.then(data => displayData(data))
})

async function getData(location) {
    try {
        const data = await fetch(`https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${location}?unitGroup=metric&key=FWNAKE9RBN8NRBU734YD32N8E&contentType=json`)
        const object = await data.json()
        console.log(object)

        // 24h forecast
        const currentHour = Number.parseInt(object.currentConditions.datetime.slice(0, 2))
        const hourlyTemps = []
        const hourlyRain = []
        const hoursListed = []
        for (let h = currentHour; h < 24; h++) {
            hourlyTemps.push(object.days[0].hours[h].temp)
            hourlyRain.push(object.days[0].hours[h].precipprob)
            hoursListed.push(object.days[0].hours[h].datetime.slice(0, 2))
        }
        if (hourlyTemps.length < 24) {  // Ensure 24h period
            const remaining = 24 - hourlyTemps.length
            for (let H = 0; H < remaining; H++) {
                hourlyTemps.push(object.days[1].hours[H].temp)
                hourlyRain.push(object.days[1].hours[H].precipprob)
                hoursListed.push(object.days[1].hours[H].datetime.slice(0, 2))
            }
        }
        
        // Coming 7 days
        const weekTemps = []
        const weekRain = []
        for (let day = 0; day < 7; day++) {
            weekTemps.push(object.days[day].temp)
            weekRain.push(object.days[day].precipprob)
        }

        return filteredWeatherObject = {
            address: object.address,
            timeOffset: object.tzoffset,

            currentConditionText: object.currentConditions.conditions,
            cloudCover: object.currentConditions.cloudcover,
            precipProb: object.currentConditions.precipprob,
            currentTemp: object.currentConditions.temp,
            todayHigh: object.days[0].tempmax,
            todayMin: object.days[0].tempmin,
            dayHourlyTemps: hourlyTemps,
            dayHourlyRain: hourlyRain,
            hourList: hoursListed,

            lat: object.latitude,
            lon: object.longitude,
            
            weekTemps: weekTemps
        }
    } catch (error) {
        console.error(error)
    }
}

const capitalize = ([ first, ...rest ]) => first.toUpperCase() + rest.join('')
function displayData(data) {
    function displayToday(data) {
        const titleContainer = document.createElement('div')
        titleContainer.className = 'title-container'

        // TODO: UNNECESSARY?
        const title = document.createElement('h2')
        title.id = 'today-title'
        title.textContent = "Current weather"
        
        // Visually show the conditions
        const weatherIcon = document.createElement('div')
        weatherIcon.id = 'weatherIcon'
        if (data.precipProb >= 80) {
            weatherIcon.style['background-image'] = 'var(--rainy)'
        } else if (data.cloudCover >= 75 && data.precipProb < 80) {
            weatherIcon.style['background-image'] = 'var(--cloudy)'
        } else if (data.cloudCover >= 25 && data.cloudCover < 75) {
            weatherIcon.style['background-image'] = 'var(--partly-cloudy)'
        } else if (data.cloudCover < 25) {
            weatherIcon.style['background-image'] = 'var(--sunny)'
        }

        titleContainer.append(title, weatherIcon)

        const localTime = document.createElement('span')
        localTime.className = 'local-time'
        // Time conversions
        const utcOffset = data.timeOffset
        let currentTime
        if (!Number.isInteger(utcOffset)) {
            const h = Math.trunc(utcOffset)
            const mins = Number.parseInt((utcOffset - h) * 60)
            currentTime = Temporal.Now.plainTimeISO('UTC').add({ hours: h, minutes: mins}).toString()
        } else {
            currentTime = Temporal.Now.plainTimeISO('UTC').add({ hours: utcOffset}).toString()
        }
        localTime.textContent = 'Local time: ' + currentTime.slice(0, 5)
        
        const description = document.createElement('span')
        description.className = 'description'
        description.textContent = `Description: ${data.currentConditionText}`

        const clouds = document.createElement('span')
        clouds.textContent = `Cloud cover: ${data.cloudCover}%`

        const precipitation = document.createElement('span')
        precipitation.textContent = `Precipitation probability: ${data.precipProb}%`

        const temperature = document.createElement('span')
        temperature.textContent = `Temperature: ${data.currentTemp}°C`

        const tempCurveContainer = document.createElement('div')
        const tempCurve = drawTemperatureCurve(data.dayHourlyTemps, data.hourList)
        tempCurveContainer.className = 'temp-curve-container'
        tempCurveContainer.append(tempCurve)

        const hourlyRainContainer = document.createElement('div')
        hourlyRainContainer.classList.add('hourly-container', 'hourly-rain')
        
        todayInfo.append(titleContainer, localTime, description, precipitation, clouds, temperature, tempCurveContainer)
    }

    function displayForecast(data) {
        const title = document.createElement('h2')
        title.textContent = "7 day forecast"

        const tempContainer = document.createElement('div')
        for (let day = 0; day < 7; day++) {
            const temperature = document.createElement('span')
            temperature.textContent = `${data.weekTemps[day]}°C`
            tempContainer.append(temperature)
        }

        forecastInfo.append(title, tempContainer)
    }

    displayToday(data)
    displayForecast(data)
}


function drawTemperatureCurve(temps, hours) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const maxTemp = Math.max(...temps)
    svg.setAttribute('viewBox', '0 0 500 100')
    svg.setAttribute('preserveAspectRatio', 'xMinYMin meet')

    // Temperature curve
    const curve = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
    let points = ''
    let x = 1
    for (let i = 0; i < temps.length; i++) {
        // Subtract temp from the max temp to reverse y-axis (higher temps are visually higher)
        // Multiplier (4) for clearer visual differentiation
        points += `${x},${((maxTemp + 0.5) - temps[i]) * 4} `

        // Annotate every 3rd temp with degrees and time
        if (i % 3 === 0) {
            // temps
            const tempText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
            const tempTspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan')
            tempText.classList.add('temp-annotation')
            tempTspan.textContent = `${temps[i]}°`
            tempTspan.setAttribute('x', `${x}`)  // x coordinate
            tempTspan.setAttribute('y', `${((maxTemp + 5) - temps[i]) * 4}`)  // y coordinate
            tempText.appendChild(tempTspan)
            svg.appendChild(tempText)

            // times
            const hourText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
            const hourTspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan')
            hourText.classList.add('hour-annotation')
            hourTspan.textContent = `${hours[i]}:00`
            hourTspan.setAttribute('x', `${x}`)
            hourTspan.setAttribute('y', '100')
            hourText.appendChild(hourTspan)
            svg.appendChild(hourText)
        }
        
        x += 22  // ≈ 500 / 23, width of the viewbox divided by 23 steps (1st step is at 0,y)
    }
    curve.setAttribute('points', points)

    // Set background color under the temp curve with a polygon
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
    polygon.setAttribute('points', `${points} 500,90 1,90`)
    
    // Conditional coloring
    const avgTemp = temps.reduce((a, b) => a + b) / temps.length
    if (avgTemp > 20) {
        curve.setAttribute('stroke', 'rgb(249, 115, 43)')
        polygon.setAttribute('fill', 'rgba(249, 115, 43, 0.2)')
    } else if (avgTemp <= 20 && avgTemp > 10) {
        curve.setAttribute('stroke', 'rgb(255, 229, 83)')
        polygon.setAttribute('fill', 'rgba(255, 229, 83, 0.2)')
    } else {
        curve.setAttribute('stroke', 'rgb(41, 101, 255)')
        polygon.setAttribute('fill', 'rgba(41, 101, 255, 0.2)')
    }
       
    svg.prepend(curve, polygon)  // prepend to not cover the annotations
    return svg
}