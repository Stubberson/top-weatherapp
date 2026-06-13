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

        // Time conversions
        let queriedTime
        const utcOffset = data.timeOffset
        const offsetHour = Math.trunc(utcOffset)
        const offsetMins = Number.parseInt((utcOffset - offsetHour) * 60)
        if (!Number.isInteger(utcOffset)) {    
            queriedTime = Temporal.Now.plainTimeISO('UTC').add({ hours: offsetHour, minutes: offsetMins})
        } else {
            queriedTime = Temporal.Now.plainTimeISO('UTC').add({ hours: utcOffset})
        }

        const localTime = document.createElement('div')
        localTime.id = 'local-time'
        localTime.textContent = queriedTime.toString().slice(0, 5)

        const temperature = document.createElement('span')
        temperature.id = 'temp-amount'
        temperature.textContent = `${data.currentTemp} °C`

        timeTempContainer.append(localTime, temperature)
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

        // Temp and rain graph
        const graphContainer = document.createElement('div')
        const graph = drawGraph(data.dayHourlyTemps, data.dayHourlyRain, data.hourList)
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


function drawGraph(temps, rain, hours) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 600 100')
    svg.setAttribute('preserveAspectRatio', 'xMinYMin meet')

    // Temperature curve
    const curve = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
    const maxTemp = Math.max(...temps)
    let points = ''
    let tempX = 1
    for (let i = 0; i < temps.length; i++) {
        // Subtract temp from the max temp to reverse y-axis (higher temps are visually higher)
        // Multiplier (4) for clearer visual differentiation
        points += `${tempX},${((maxTemp + 0.5) - temps[i]) * 4} `

        // Annotate every 3rd temp with degrees and time
        if (i % 3 === 0) {
            // temps
            const tempText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
            const tempTspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan')
            tempText.classList.add('temp-annotation')
            tempTspan.textContent = `${temps[i]}°`
            tempTspan.setAttribute('x', tempX)  // x coordinate
            tempTspan.setAttribute('y', `${((maxTemp + 5) - temps[i]) * 4}`)  // y coordinate
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
        
        tempX += 26  // ≈ 600 / 23, width of the viewbox divided by 23 steps (1st step is at 0,y)
    }
    curve.setAttribute('points', points)

    // Rain histogram
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')  // First, create a rain drop fill for the rain prob bg
    const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern')
    const drop = document.createElementNS('http://www.w3.org/2000/svg', 'image')
    pattern.setAttribute('id', 'drop')
    pattern.setAttribute('viewBox', '0, 0, 5, 5')
    pattern.setAttribute('width', '20%')
    pattern.setAttribute('height', '20%')
    drop.setAttribute('href', './visuals/rain_drop.svg')
    drop.setAttribute('width', '4')
    drop.setAttribute('height', '4')
    drop.setAttribute('x', '1')
    pattern.appendChild(drop)
    defs.appendChild(pattern)
    svg.prepend(defs)

    let previous = -1  // Ensures an annotation for 1st prob
    let rainX = 1
    for (let p of rain) {
        const rainLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
        rainLine.classList.add('rain-prob')
        rainLine.setAttribute('x1', rainX)
        rainLine.setAttribute('x2', rainX + 24)
        rainLine.setAttribute('y1', 100 - p * 0.3)  // Force the rain prob lower into the graph, otherwise busy visually
        rainLine.setAttribute('y2', 100 - p * 0.3)

        const rainLineBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        rainLineBg.classList.add('rain-prob-bg')
        rainLineBg.setAttribute('x', rainX)
        rainLineBg.setAttribute('y', 100 - p * 0.28)  // Ensures that the drops don't overlap with rainLine
        rainLineBg.setAttribute('width', 23)
        rainLineBg.setAttribute('height', p * 0.3)
        rainLineBg.setAttribute('fill', 'url(#drop)')
        svg.prepend(rainLine, rainLineBg)

        // Percentage annotation
        if (p !== previous) {
            const rainText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
            const rainTspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan')
            rainText.classList.add('rain-annotation')
            rainTspan.textContent = `${p}%`
            rainTspan.setAttribute('x', rainX)
            rainTspan.setAttribute('y', 100 - p * 0.3 - 2)  // Above the line
            rainText.appendChild(rainTspan)
            svg.appendChild(rainText)
        }
        
        previous = p
        rainX += 25
    }

    // Set background color under the temp curve with a polygon
    const curveBg = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
    curveBg.setAttribute('points', `${points} 600,100 1,100`)
    
    // Conditional coloring
    const avgTemp = temps.reduce((a, b) => a + b) / temps.length
    if (avgTemp > 25) {
        curve.setAttribute('stroke', 'rgb(249, 115, 43)')
        curveBg.setAttribute('fill', 'rgba(249, 115, 43, 0.2)')
    } else if (avgTemp <= 25 && avgTemp > 15) {
        curve.setAttribute('stroke', 'rgb(255, 229, 83)')
        curveBg.setAttribute('fill', 'rgba(255, 229, 83, 0.2)')
    } else {
        curve.setAttribute('stroke', 'rgb(41, 101, 255)')
        curveBg.setAttribute('fill', 'rgba(41, 101, 255, 0.2)')
    }
       
    svg.prepend(curve, curveBg)  // prepend to not cover the annotations
    return svg
}