const queriedLocation = document.querySelector('input')
queriedLocation.focus()
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
            sunrise: object.currentConditions.sunriseEpoch,
            sunset: object.currentConditions.sunsetEpoch,

            currentConditionText: object.currentConditions.conditions,
            cloudCover: object.currentConditions.cloudcover,
            precipProb: object.currentConditions.precipprob,
            currentTemp: object.currentConditions.temp,
            todayHigh: object.days[0].tempmax,
            todayLow: object.days[0].tempmin,
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

function displayData(data) {
    function displayToday(data) {
        // Basic info
        const basicInfoContainer = document.createElement('div')
        basicInfoContainer.className = 'basic-info-container'
        
        const weatherIcon = document.createElement('div')
        weatherIcon.id = 'weatherIcon'
        const currentEpoch = Temporal.Now.instant().epochMilliseconds / 1000  // Weather API epochs are in seconds
        if (currentEpoch < data.sunrise || currentEpoch > data.sunset) {
            weatherIcon.style['background-image'] = 'var(--night)'
        } else if (data.precipProb >= 80) {
            weatherIcon.style['background-image'] = 'var(--rainy)'
        } else if (data.cloudCover >= 75 && data.precipProb < 80) {
            weatherIcon.style['background-image'] = 'var(--cloudy)'
        } else if (data.cloudCover >= 25 && data.cloudCover < 75) {
            weatherIcon.style['background-image'] = 'var(--partly-cloudy-day)'
        } else if (data.cloudCover < 25) {
            weatherIcon.style['background-image'] = 'var(--clear-day)'
        }

        const timeTempContainer = document.createElement('div')
        timeTempContainer.className = 'time-temp-container'

        const timeHiLo = document.createElement('div')
        timeHiLo.id = 'time-hi-lo'
        timeHiLo.textContent = getLocalTime(data.timeOffset).toString().slice(0, 5)
        timeHiLo.textContent += ' – High: ' + data.todayHigh + '°C | Low: ' + data.todayLow + '°C'

        const temperature = document.createElement('span')
        temperature.id = 'temp-amount'
        temperature.textContent = `${data.currentTemp}°C`

        timeTempContainer.append(timeHiLo, temperature)
        basicInfoContainer.append(weatherIcon, timeTempContainer)

        // Extra information
        const extraInfoContainer = document.createElement('div')
        extraInfoContainer.className = 'extra-info-container'
        
        const description = document.createElement('span')
        description.className = 'description'
        description.textContent = `${data.currentConditionText}`

        const cloudCover = document.createElement('span')
        cloudCover.id = 'cloud-cover'
        cloudCover.textContent = `Cloud cover: ${data.cloudCover}%`

        extraInfoContainer.append(description, cloudCover)
        basicInfoContainer.append(extraInfoContainer)

        // Today's temp and rain graph
        const graphContainer = document.createElement('div')
        const graph = drawGraph(data)
        graphContainer.className = 'graph-container'
        graphContainer.append(graph)
        
        todayInfo.append(basicInfoContainer, graphContainer)
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

function getLocalTime(offset) {
    const offsetHour = Math.trunc(offset)
    const offsetMins = Number.parseInt((offset - offsetHour) * 60)
    
    if (!Number.isInteger(offset)) {    
        return Temporal.Now.plainTimeISO('UTC').add({ hours: offsetHour, minutes: offsetMins})
    } else {
        return Temporal.Now.plainTimeISO('UTC').add({ hours: offset})
    }
}

function drawGraph(data) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 600 100')
    svg.setAttribute('preserveAspectRatio', 'xMinYMin meet')
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')

    drawTemp(svg, defs, data)
    drawRain(svg, defs, data)

    return svg
}

function drawTemp(svg, defs, data) {
    const temps = data.dayHourlyTemps
    const hours = data.hourList

    // Temperature curve
    const avgTemp = temps.reduce((a, b) => a + b) / temps.length
    const maxTemp = Math.max(...temps)
    
    const curve = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
    let points = ''
    let tempX = 1
    const [riseHour, setHour] = getRiseSet(data)  // For determining the x-coordinates for sunrise and sunset
    let riseX, setX
    for (let i = 0; i < temps.length; i++) {
        // Subtract temp from the max temp to reverse y-axis (higher temps are visually higher)
        // Multiplier (4) for clearer visual differentiation
        points += `${tempX},${((maxTemp + 0.5) - temps[i]) * 4} `

        // Annotate only every 3rd temp for clarity
        if (i % 3 === 0) {
            // temps
            const tempText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
            const tempTspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan')
            tempText.classList.add('temp-annotation')
            tempTspan.textContent = `${temps[i]}°`
            tempTspan.setAttribute('x', tempX)
            tempTspan.setAttribute('y', `${((maxTemp + 5) - temps[i]) * 4}`)
            tempText.appendChild(tempTspan)
            svg.appendChild(tempText)

            // times
            const hourText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
            const hourTspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan')
            hourText.classList.add('hour-annotation')
            hourTspan.textContent = `${hours[i]}:00`
            hourTspan.setAttribute('x', tempX)
            hourTspan.setAttribute('y', '110')
            hourText.appendChild(hourTspan)
            svg.appendChild(hourText)
        }

        if (data.hourList[i] === riseHour) riseX = tempX
        if (data.hourList[i] === setHour) setX = tempX
        
        tempX += 26  // ≈ 600 / 23, width of the viewbox divided by 23 steps (1st step is at 0,y)
    }
    curve.setAttribute('points', points)

    // Set background color under the temp curve with a polygon
    const curveBg = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
    curveBg.setAttribute('points', `${points} 600,100 1,100`)
    determineColoring(svg, defs, avgTemp, curve, curveBg, riseX, setX)
}

function determineColoring(svg, defs, avgTemp, curve, curveBg, riseX, setX) {
    if (avgTemp > 25) {
        curve.setAttribute('stroke', 'rgb(249, 115, 43)')
        curveBg.setAttribute('fill', 'rgba(249, 115, 43, 0.2)')
    } else if (avgTemp <= 25 && avgTemp > 10) {
        curve.setAttribute('stroke', 'rgb(255, 229, 83)')
        curveBg.setAttribute('fill', 'rgba(255, 229, 83, 0.2)')
    } else {
        curve.setAttribute('stroke', 'rgb(41, 101, 255)')
        curveBg.setAttribute('fill', 'rgba(41, 101, 255, 0.2)')
    }

    // Create gradient indicating sunrise and sunset
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient')
    gradient.id = 'background-gradient'
    // Create 7 stops for better design of the gradient
    const stops = Array.from({ length: 7 }, () => document.createElementNS('http://www.w3.org/2000/svg', 'stop'))
    stops[0].setAttribute('offset', 0)
    if (riseX < setX) {
        stops[1].setAttribute('offset', riseX / 600 - 0.05)  // The 'offset' property only accepts percentages
        stops[2].setAttribute('offset', riseX / 600)  // and the width of the bg === 600
        stops[3].setAttribute('offset', (riseX + ((setX - riseX) / 2)) / 600)  // Night mid point
        stops[4].setAttribute('offset', setX / 600)
        stops[5].setAttribute('offset', setX / 600 + 0.05)
    } else {
        stops[1].setAttribute('offset', setX / 600 - 0.05)
        stops[2].setAttribute('offset', setX / 600)
        stops[3].setAttribute('offset', (setX + ((riseX - setX) / 2)) / 600)
        stops[4].setAttribute('offset', riseX / 600)
        stops[5].setAttribute('offset', riseX / 600 + 0.05)
    }
    stops[6].setAttribute('offset', 1)

    stops.forEach((stop, i) => {
        stop.setAttribute('id', `stop${i}`)
        stop.setAttribute('class', 'gradient-stop')
        gradient.appendChild(stop)
    })
    
    defs.appendChild(gradient)
    curveBg.setAttribute('fill', 'url(#background-gradient)')
    svg.prepend(curve, curveBg)
}

function getRiseSet(data) {
    // Get sunrise and sunset hours for linear gradient
    let rise
    let set
    const offsetHour = Math.trunc(data.timeOffset)
    const offsetMins = Number.parseInt((data.timeOffset - offsetHour) * 60)
    if (!Number.isInteger(data.timeOffset)) {
        rise = Temporal.Instant.fromEpochMilliseconds(data.sunrise * 1000)
            .add( {hours: offsetHour, minutes: offsetMins} )
            .round('hour')
        set = Temporal.Instant.fromEpochMilliseconds(data.sunset * 1000)
            .add( {hours: offsetHour, minutes: offsetMins} )
            .round('hour')
    } else {
        rise = Temporal.Instant.fromEpochMilliseconds(data.sunrise * 1000)
            .add( {hours: offsetHour} )
            .round('hour')
        set = Temporal.Instant.fromEpochMilliseconds(data.sunset * 1000)
            .add( {hours: offsetHour} )
            .round('hour')
    }
    rise = rise.toString().slice(11, 13)
    set = set.toString().slice(11, 13)

    return [rise, set]
}

function drawRain(svg, defs, data) {
    const temps = data.dayHourlyTemps
    const rain = data.dayHourlyRain

    // Pattern definitions for rain and snow
    const rainPattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern')
    const drop = document.createElementNS('http://www.w3.org/2000/svg', 'image')
    const snowPattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern')
    const snow = document.createElementNS('http://www.w3.org/2000/svg', 'image')
    rainPattern.setAttribute('id', 'drop')
    rainPattern.setAttribute('viewBox', '0, 0, 10, 10')
    rainPattern.setAttribute('width', '50%')
    rainPattern.setAttribute('height', '50%')
    snowPattern.setAttribute('id', 'snow')
    snowPattern.setAttribute('viewBox', '0, 0, 10, 10')
    snowPattern.setAttribute('width', '50%')
    snowPattern.setAttribute('height', '50%')
    drop.setAttribute('href', './visuals/rain_drop.svg')
    drop.setAttribute('width', '7')
    drop.setAttribute('height', '7')
    drop.setAttribute('x', '1.5')
    snow.setAttribute('href', './visuals/snowflake.svg')
    snow.setAttribute('width', '7')
    snow.setAttribute('height', '7')
    snow.setAttribute('x', '1.5')
    rainPattern.appendChild(drop)
    snowPattern.appendChild(snow)
    defs.append(rainPattern, snowPattern)
    svg.prepend(defs)

    let previous = -1  // Ensures an annotation for 1st prob
    let rainX = 1
    for (let p = 0; p < rain.length; p++) {
        const rainLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
        rainLine.classList.add('rain-prob-line')
        rainLine.setAttribute('x1', rainX)
        rainLine.setAttribute('x2', rainX + 24)
        rainLine.setAttribute('y1', 100 - rain[p] * 0.3)  // Force the rain prob lower into the graph, otherwise busy visually
        rainLine.setAttribute('y2', 100 - rain[p] * 0.3)
        temps[p] > 0 ? rainLine.setAttribute('stroke', 'rgba(0, 0, 255, 0.8)') : rainLine.setAttribute('stroke', 'rgb(140, 140, 140)')

        const rainLineBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        rainLineBg.classList.add('rain-prob-bg')
        rainLineBg.setAttribute('x', rainX)
        rainLineBg.setAttribute('y', 100 - rain[p] * 0.28)  // Ensures that the drops don't overlap with rainLine
        rainLineBg.setAttribute('width', 23)
        rainLineBg.setAttribute('height', rain[p] * 0.3)
        temps[p] > 0 ? rainLineBg.setAttribute('fill', 'url(#drop)') : rainLineBg.setAttribute('fill', 'url(#snow)')
        svg.append(rainLine, rainLineBg)

        // Percentage annotation
        if (rain[p] !== previous) {
            const rainText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
            const rainTspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan')
            rainText.classList.add('rain-annotation')
            rainTspan.textContent = `${rain[p]}%`
            rainTspan.setAttribute('x', rainX)
            rainTspan.setAttribute('y', 100 - rain[p] * 0.3 - 2)  // Above the line
            temps[p] > 0 ? rainText.setAttribute('fill', 'rgba(0, 0, 255, 0.8)') : rainText.setAttribute('fill', 'rgb(140, 140, 140)')
            rainText.appendChild(rainTspan)
            svg.appendChild(rainText)
        }
        
        previous = rain[p]
        rainX += 25
    }
}