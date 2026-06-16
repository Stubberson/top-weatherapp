const inputContainer = document.querySelector('.user-input')
const queriedLocation = inputContainer.querySelector('input')
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

    const location = queriedLocation.value
    const weatherData = getData(location)
    const loading = document.createElement('img')
    loading.src = './visuals/loading.gif'
    loading.style['width'] = '15px'
    loading.style['height'] = '15px'
    inputContainer.append(loading)
    
    weatherData.then(data => {
        displayData(data)
        loading.remove()
    })
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

        // The currentConditions temperature seems often off...
        const currentTempHour = Number.parseInt(getLocalTime(object.tzoffset).toString().slice(0, 2))

        // TODO: Add alerts?
        return filteredWeatherObject = {
            address: object.address,
            timeOffset: object.tzoffset,
            sunrise: object.currentConditions.sunriseEpoch,
            sunset: object.currentConditions.sunsetEpoch,

            currentConditionText: object.currentConditions.conditions,
            cloudCover: object.currentConditions.cloudcover,
            precipProb: object.currentConditions.precipprob,
            currentTemp: object.days[0].hours[currentTempHour].temp,
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
        if (!isDay(data)) {
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

function drawGraph(data) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 600 110')
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')

    // Determine the x-coordinates for sunrise and sunset
    let [riseHour, setHour] = getRiseSet(data)
    riseHour = riseHour.toString().slice(11, 13)
    setHour = setHour.toString().slice(11, 13)

    drawTemp(svg, defs, data, riseHour, setHour)
    drawRain(svg, defs, data, riseHour, setHour)

    return svg
}

function drawTemp(svg, defs, data, riseHour, setHour) {
    const temps = data.dayHourlyTemps
    const hours = data.hourList

    // Temperature curve
    const avgTemp = temps.reduce((a, b) => a + b) / temps.length
    const maxTemp = Math.max(...temps)
    
    const curve = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
    let points = ''
    let tempX = 1
    let riseX, setX
    for (let i = 0; i < temps.length; i++) {
        // Subtract temp from the max temp to reverse y-axis (higher temps are visually higher)
        // Multiplier (4) for clearer visual differentiation
        points += `${tempX},${((maxTemp + 2) - temps[i]) * 4} `

        // Get sunset and sunrise x-coords
        if (data.hourList[i] === riseHour) riseX = tempX
        if (data.hourList[i] === setHour) setX = tempX

        // Annotate only every 3rd temp for clarity
        if (i % 3 === 0) {
            // temps
            const tempText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
            const tempTspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan')
            tempText.classList.add('temp-annotation')
            tempTspan.textContent = `${temps[i]}°`
            tempTspan.setAttribute('x', tempX)
            tempTspan.setAttribute('y', `${((maxTemp + 6) - temps[i]) * 4}`)
            tempText.appendChild(tempTspan)
            // Color the text based on sunrise and sunset. 'tempX +/- 1' is for visual clarity
            if ((tempX - 1 < setX && tempX + 1 > riseX) || (tempX + 1 > riseX && setX === undefined) || 
                (isDay(data) && setX === undefined) || (tempX + 1 > riseX && riseX > setX) || (riseX === setX && riseX !== undefined)) {
                tempText.setAttribute('fill', 'black')
            } else {
                tempText.setAttribute('fill', 'rgb(255, 253, 238)')
                tempText.setAttribute('filter', 'drop-shadow(0px 1px 0px rgb(35, 60, 76))')
                tempTspan.setAttribute('filter', 'drop-shadow(0px 0px 2px rgb(243, 243, 243))')
            }
            
            svg.appendChild(tempText)

            // times
            const hourText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
            const hourTspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan')
            hourText.classList.add('hour-annotation')
            hourTspan.textContent = `${hours[i]}:00`
            hourTspan.setAttribute('x', tempX)
            hourTspan.setAttribute('y', '109')
            hourText.appendChild(hourTspan)
            svg.appendChild(hourText)
        }

        tempX += 26  // ≈ 600 / 23, width of the viewbox divided by 23 steps (1st step is at 0,y)
    }
    curve.setAttribute('points', points)

    // Set background color under the temp curve with a polygon
    const curveBg = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
    curveBg.id = 'curve-default-background'
    curveBg.setAttribute('points', `${points} 600,100 1,100`)
    determineColoring(svg, defs, data, avgTemp, curve, curveBg, riseX, setX)
    
    // Add little moon(s) to indicate night(s) clearly
    const moon = document.createElementNS('http://www.w3.org/2000/svg', 'image')
    moon.setAttribute('href', './visuals/moon_stars.svg')
    moon.setAttribute('width', '10px')
    moon.setAttribute('height', '10px')
    moon.setAttribute('y', 0)
    if (riseX > setX || riseX === setX) {
        moon.setAttribute('x', riseX + ((setX - riseX) / 2) - 5)
        svg.append(moon)
    } else {
        // 2 moons if day is short
        moon.setAttribute('x', riseX / 2 - 5)

        const moonTwo = document.createElementNS('http://www.w3.org/2000/svg', 'image')
        moonTwo.setAttribute('href', './visuals/moon_stars.svg')
        moonTwo.setAttribute('width', '10px')
        moonTwo.setAttribute('height', '10px')
        moonTwo.setAttribute('y', 0)
        moonTwo.setAttribute('x', setX + ((600 - setX) / 2))
        svg.append(moon, moonTwo)
    }
}

function drawRain(svg, defs, data, riseHour, setHour) {
    const temps = data.dayHourlyTemps
    const rain = data.dayHourlyRain

    // Pattern definitions for rain and snow
    const rainPattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern')
    const drop = document.createElementNS('http://www.w3.org/2000/svg', 'image')
    const snowPattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern')
    const snow = document.createElementNS('http://www.w3.org/2000/svg', 'image')
    rainPattern.id = 'rain-pattern'
    rainPattern.setAttribute('width', '100%')
    rainPattern.setAttribute('height', '100%')
    snowPattern.id = 'snow-pattern'
    snowPattern.setAttribute('width', '50%')
    snowPattern.setAttribute('height', '100%')
    drop.id = 'rain-drop'
    drop.setAttribute('href', './visuals/rain_drop.svg')
    drop.setAttribute('width', '7')
    drop.setAttribute('height', '7')
    drop.setAttribute('x', '9')
    snow.id = 'snow-drop'
    snow.setAttribute('href', './visuals/snowflake.svg')
    snow.setAttribute('width', '7')
    snow.setAttribute('height', '7')
    snow.setAttribute('x', '4.5')

    // Rain-fall and snow-fall animations
    const rainFall = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform')
    rainFall.setAttribute('attributeName', 'transform')
    rainFall.setAttribute('type', 'translate')
    rainFall.setAttribute('from', '0 -10')
    rainFall.setAttribute('to', '0 30')
    rainFall.setAttribute('dur', '2s')
    rainFall.setAttribute('repeatCount', 'indefinite')

    const snowFall = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform')
    snowFall.setAttribute('attributeName', 'transform')
    snowFall.setAttribute('type', 'translate')
    snowFall.setAttribute('from', '0 -10')
    snowFall.setAttribute('to', '0 30')
    snowFall.setAttribute('dur', '2s')
    snowFall.setAttribute('repeatCount', 'indefinite')

    drop.append(rainFall)
    snow.append(snowFall)
    rainPattern.appendChild(drop)
    snowPattern.appendChild(snow)
    defs.append(rainPattern, snowPattern)
    svg.prepend(defs)

    let previous = -1  // Ensures an annotation for 1st prob
    let rainX = 1
    let riseX, setX
    for (let p = 0; p < rain.length; p++) {
        // Get sunset and sunrise x-coords
        if (data.hourList[p] === riseHour) riseX = rainX
        if (data.hourList[p] === setHour) setX = rainX

        const rainLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
        rainLine.classList.add('rain-prob-line')
        rainLine.setAttribute('x1', rainX)
        rainLine.setAttribute('x2', rainX + 24)
        rainLine.setAttribute('y1', 100 - rain[p] * 0.3)  // Force the rain prob lower into the graph, otherwise busy visually
        rainLine.setAttribute('y2', 100 - rain[p] * 0.3)
        temps[p] > 0 ? rainLine.setAttribute('stroke', 'rgb(60, 157, 255)') : rainLine.setAttribute('stroke', 'rgb(140, 140, 140)')

        const rainLineBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        rainLineBg.classList.add('rain-prob-bg')
        rainLineBg.setAttribute('x', rainX)
        rainLineBg.setAttribute('y', 100 - rain[p] * 0.28)  // Ensures that the drops don't overlap with rainLine
        rainLineBg.setAttribute('width', 23)
        rainLineBg.setAttribute('height', rain[p] * 0.28)
        temps[p] > 0 ? rainLineBg.setAttribute('fill', 'url(#rain-pattern)') : rainLineBg.setAttribute('fill', 'url(#snow-pattern)')
        svg.append(rainLine, rainLineBg)

        // Percentage annotation
        if (rain[p] !== previous) {
            const rainText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
            const rainTspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan')
            rainText.classList.add('rain-annotation')
            rainTspan.textContent = `${rain[p]}%`
            rainTspan.setAttribute('x', rainX)
            rainTspan.setAttribute('y', 100 - rain[p] * 0.3 - 2)  // '- 2' -> Above the line
            temps[p] > 0 ? rainText.setAttribute('fill', 'rgb(60, 157, 255)') : rainText.setAttribute('fill', 'rgb(140, 140, 140)')
            
            rainText.appendChild(rainTspan)
            svg.appendChild(rainText)
        }
        
        previous = rain[p]
        rainX += 25
    }
}

function determineColoring(svg, defs, data, avgTemp, curve, curveBg, riseX, setX) {
    // Create background gradient indicating sunrise and sunset
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient')
    gradient.id = 'curve-gradient-background'
    
    // The 'offset' property requires percentages and the width of the bg === 600
    const stops = Array.from({ length: 19 }, () => document.createElementNS('http://www.w3.org/2000/svg', 'stop'))
    stops[0].setAttribute('offset', 0)
    // (Basically) if day, draw night, else, draw day
    if ((riseX > setX) || (riseX === setX)) {
        const nightLengthP = (riseX - setX) / 600
        stops.forEach((stop, i) => stop.setAttribute('id', `night-stop${i}`))
        stops[1].setAttribute('offset', setX / 600)
        stops[2].setAttribute('offset', setX / 600)
        stops[3].setAttribute('offset', setX / 600 + nightLengthP * 0.05)
        stops[4].setAttribute('offset', setX / 600 + nightLengthP * 0.05)
        stops[5].setAttribute('offset', setX / 600 + nightLengthP * 0.1)
        stops[6].setAttribute('offset', setX / 600 + nightLengthP * 0.1)
        stops[7].setAttribute('offset', setX / 600 + nightLengthP * 0.15)
        stops[8].setAttribute('offset', setX / 600 + nightLengthP * 0.15)
        stops[9].setAttribute('offset', (setX + ((riseX - setX) / 2)) / 600)  // Mid point
        stops[10].setAttribute('offset', riseX / 600 - nightLengthP * 0.15)
        stops[11].setAttribute('offset', riseX / 600 - nightLengthP * 0.15)
        stops[12].setAttribute('offset', riseX / 600 - nightLengthP * 0.1)
        stops[13].setAttribute('offset', riseX / 600 - nightLengthP * 0.1)
        stops[14].setAttribute('offset', riseX / 600 - nightLengthP * 0.05)
        stops[15].setAttribute('offset', riseX / 600 - nightLengthP * 0.05)
        stops[16].setAttribute('offset', riseX / 600)
        stops[17].setAttribute('offset', riseX / 600)
    } else {
        const dayLengthP = (setX - riseX) / 600
        stops.forEach((stop, i) => stop.setAttribute('id', `day-stop${i}`))
        stops[1].setAttribute('offset', riseX / 600 - dayLengthP * 0.15)
        stops[2].setAttribute('offset', riseX / 600 - dayLengthP * 0.15)
        stops[3].setAttribute('offset', riseX / 600 - dayLengthP * 0.1)
        stops[4].setAttribute('offset', riseX / 600 - dayLengthP * 0.1)
        stops[5].setAttribute('offset', riseX / 600 - dayLengthP * 0.05)
        stops[6].setAttribute('offset', riseX / 600 - dayLengthP * 0.05)
        stops[7].setAttribute('offset', riseX / 600)
        stops[8].setAttribute('offset', riseX / 600)
        stops[9].setAttribute('offset', (riseX + ((setX - riseX) / 2)) / 600)
        stops[10].setAttribute('offset', setX / 600 + dayLengthP * 0.05)
        stops[11].setAttribute('offset', setX / 600 + dayLengthP * 0.05)
        stops[12].setAttribute('offset', setX / 600 + dayLengthP * 0.1)
        stops[13].setAttribute('offset', setX / 600 + dayLengthP * 0.1)
        stops[14].setAttribute('offset', setX / 600 + dayLengthP * 0.15)
        stops[15].setAttribute('offset', setX / 600 + dayLengthP * 0.15)
        stops[16].setAttribute('offset', setX / 600)
        stops[17].setAttribute('offset', setX / 600)
    }
    stops[18].setAttribute('offset', 1)
    
    stops.forEach((stop, i) => {
        stop.setAttribute('class', 'gradient-stop')
        gradient.appendChild(stop)
    })

    defs.appendChild(gradient)
    curveBg.setAttribute('fill', 'url(#curve-gradient-background)')
    curve.setAttribute('stroke', 'url(#curve-gradient-background)')
    svg.prepend(curve, curveBg)
}

function getRiseSet(data) {
    // Get sunrise and sunset hours in local time
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

    return [rise, set]
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

function isDay(data) {
    // Is it currently day locally?
    const currentEpoch = Temporal.Now.instant().epochMilliseconds
    if (currentEpoch / 1000 > data.sunrise && currentEpoch / 1000 < data.sunset) {
        return true
    } else {
        return false
    }
}