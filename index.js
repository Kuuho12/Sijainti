let coords = null
let error = null
let zoom = 15;
//const defaultSrc = "https://www.openstreetmap.org/export/embed.html?bbox=3.4936523437500004%2C59.355596110016315%2C50.73486328125001%2C69.88501003874241&amp;layer=mapnik";
let src = ""
let locationTapa = ""
function getLocation() {
    $("#isokarttateksti").css("display", "none")
    $("#locationteksti").text("")
    $("#tarkkuusteksti").text("")
    $("#tapateksti").text("")
    $("#locationteksti").text("Haetaan sijaintia...")
    $("#loader").show();
    if (!navigator.geolocation) {
        error = "Geolokaatio ei toimi tässä selaimessa"
        $("#locationteksti").text(error);
        $("#loader").hide();
    } else {
        navigator.geolocation.getCurrentPosition(locationSuccess, locationError);
    }
}
function locationSuccess(position) {
    $("#loader").hide();
    console.log("juu")
    coords = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        acc: position.coords.accuracy
    }
    if (coords) {
        const lat = coords.lat;
        const lon = coords.lon;
        const accuracy = Math.round(coords.acc)
        let delta = 0.002; // ~200 m, tweak as needed for zoom level
        if (accuracy < 20) {
            locationTapa = "GPS-paikannukseen"
            delta = 0.001;
            zoom = 16
        } else if (accuracy < 500) {
            locationTapa = "käytössä oleviin WiFi-yhteyksiin"
        } else {
            locationTapa = "IP-osoitteeseen"
            zoom = 13
            delta = 0.01;
        }
        const lonMin = lon - delta;
        const lonMax = lon + delta;
        const latMin = lat - delta;
        const latMax = lat + delta;
        const bbox = `${lonMin},${latMin},${lonMax},${latMax}`; // Kartan näyttämä neliö
        //const circleParams = `&circle=${lat},${lon},${accuracy}`;
        src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(lat + ',' + lon)}`;
        $("#kartta").attr("src", src);
        $("#isokarttateksti").css("display", "block")
        $("#isokarttalinkki").attr("href", `https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lon}#map=${zoom}/${coords.lat}/${coords.lon}`);
        $("#locationteksti").text(`Leveysaste: ${coords.lat} Pituusaste: ${coords.lon}`);
        $("#tarkkuusteksti").text(`Tarkkuus: ${accuracy} metriä`)
        $("#tapateksti").text(`Tarkkuuden perusteella sijainti perustuu ${locationTapa}`);
    }
}
function locationError(virhe) {
    $("#loader").hide();
    console.log(virhe)
    switch (virhe.code) {
        case virhe.PERMISSION_DENIED:
        case virhe.POSITION_UNAVAILABLE:
            error = "Yritetään saada sijainti IP-osoitteella"
            getIpLocationFallback(virhe)
            break;
        /*case virhe.PERMISSION_DENIED:
            error = "Estit sijainnin käytön"
            break;
        case virhe.POSITION_UNAVAILABLE:
            error = "Sijainti ei ole saatavissa"
            break;*/
        case virhe.TIMEOUT:
            error = "Sijaintipyyntö vanheni"
            break;
        case virhe.UNKNOWN_ERROR:
            error = "Tuntematon virhe tapahtui"
            break;
    }
    $("#locationteksti").text(error);
}

async function getIpLocationFallback(virhe) {
    $("#loader").show();
    console.log("Attempting IP-based location fallback...");

    try {
        // 2. Fetch data from an IP Geolocation API
        // const response = await fetch("http://ip-api.com/json/");
        // käytetään paikallista proxy-palvelinta
        const response = await fetch("https://www.innowise.fi/sijainti/get-ip-location.php");

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.status === 'success') {
            console.log(data)
            const lat = data.lat;
            const lon = data.lon;
            const nettitarjoaja = data.isp;
            const delta = 0.01
            zoom = 13
            const lonMin = lon - delta;
            const lonMax = lon + delta;
            const latMin = lat - delta;
            const latMax = lat + delta;
            const bbox = `${lonMin},${latMin},${lonMax},${latMax}`; // Kartan näyttämä neliö
            src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(lat + ',' + lon)}`;
            $("#kartta").attr("src", src);
            $("#isokarttateksti").css("display", "block")
            $("#isokarttalinkki").attr("href", `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`);
            $("#locationteksti").text(`Leveysaste: ${lat}. Pituusaste: ${lon}`);
            $("#tarkkuusteksti").text(`Sijainti perustuu nettiyhteyden IP-osoitteeseen (${nettitarjoaja}).`)
            $("#loader").hide();
            return;
        } else {
            $("#locationteksti").text("Sijainnin saanti IP-osoitteella epäonnistui");
            $("#loader").hide();
        }
    } catch (e) {
        $("#locationteksti").text(`Sijainnin saanti IP-osoitteella epäonnistui: ${e}`);
        $("#loader").hide();
    }
}