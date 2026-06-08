const userLocation = document.querySelector('input')
const button = document.querySelector('button')

button.addEventListener('click', () => {
    const location = userLocation.value
    const currentHour = Temporal.Now.zonedDateTimeISO().hour
    const weatherData = getData(location, currentHour)
    weatherData.then(data => displayData(data))
})

async function getData(location, currentHour) {
    try {
        const data = await fetch(`https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${location}?unitGroup=metric&key=FWNAKE9RBN8NRBU734YD32N8E&contentType=json`)
        const object = await data.json()
        console.log(object)

        // 24h temperature forecast
        const hourlyTemps = []
        for (let h = currentHour; h < 24; h++) {
            hourlyTemps.push(object.days[0].hours[h].temp)
        }
        if (hourlyTemps.length < 24) {  // If hourlyTemps doesn't create full day forecast, add next day's temps until 24hs
            const remaining = 24 - hourlyTemps.length
            for (let H = 0; H < remaining; H++) {
                hourlyTemps.push(object.days[1].hours[H].temp)
            }
        }
        
        // Coming 7 days
        const weekTemps = []
        for (let day = 0; day < 7; day++) {
            weekTemps.push(object.days[day].temp)
        }

        return filteredWeatherObject = {
            address: object.address,

            currentConditionText: object.currentConditions.conditions,
            cloudCover: object.currentConditions.cloudcover,
            precipProb: object.currentConditions.precipprob,
            currentTemp: object.currentConditions.temp,
            todayHigh: object.days[0].tempmax,
            todayMin: object.days[0].tempmin,
            dayHourlyTemps: hourlyTemps,

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
        const todayInfo = document.querySelector('.weather-information > .today')

        const title = document.createElement('h2')
        title.id = 'today-title'
        title.textContent = "Today's weather "

        const address = document.createElement('span')
        address.textContent = `Location: ${capitalize(data.address)}`
        
        const description = document.createElement('span')
        description.className = 'description'
        description.textContent = `Description: ${data.currentConditionText}`

        const clouds = document.createElement('span')
        clouds.textContent = `Cloud cover: ${data.cloudCover}%`

        const precipitation = document.createElement('span')
        precipitation.textContent = `Precipitation probability: ${data.precipProb}%`

        const temperature = document.createElement('span')
        temperature.textContent = `Temperature: ${data.currentTemp}°C`
        
        todayInfo.append(title, address, description, clouds, precipitation, temperature)
    }

    function displayForecast(data) {
        const forecastInfo = document.querySelector('.weather-information > .forecast')

        const title = document.createElement('h2')
        title.textContent = "7 day forecast"
        forecastInfo.append(title)

        for (let day = 0; day < 7; day++) {
            const temperature = document.createElement('span')
            temperature.textContent = `${data.weekTemps[day]}°C`
            forecastInfo.append(temperature)
        }
    }

    displayToday(data)
    displayForecast(data)
}


