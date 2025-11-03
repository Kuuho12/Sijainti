let coords = null
let error = null
const zoom = 15;
//const defaultSrc = "https://www.openstreetmap.org/export/embed.html?bbox=3.4936523437500004%2C59.355596110016315%2C50.73486328125001%2C69.88501003874241&amp;layer=mapnik";
let src = ""
let locationTapa = ""
function getLocation() {
if (!navigator.geolocation) {
    error = "Geolokaatio ei toimi tässä selaimessa"
    $("#locationteksti").text(error);
} else {
    navigator.geolocation.getCurrentPosition(locationSuccess, locationError);
}
}
function locationSuccess(position) {
    console.log("juu")
        coords = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            acc: position.coords.accuracy
        }
    if(coords) {
        const lat = coords.lat;
        const lon = coords.lon;
        const accuracy = coords.acc
        const delta = 0.002; // ~200 m, tweak as needed for zoom level
        const lonMin = lon - delta;
        const lonMax = lon + delta;
        const latMin = lat - delta;
        const latMax = lat + delta;
        const bbox = `${lonMin},${latMin},${lonMax},${latMax}`; // Kartan näyttämä neliö
        //const circleParams = `&circle=${lat},${lon},${accuracy}`;
        src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(lat + ',' + lon)}`;
        if(accuracy < 20) {
            locationTapa = "GPS:ään"
        } else if (accuracy < 500) {
            locationTapa = "WiFi-yhteyksiin"
        } else { locationTapa="IP:seen" }
        $("#kartta").attr("src", src);
        $("#isokarttalinkki").text("Näytä isommalla kartalla");
        $("#isokarttalinkki").attr("href", `https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lon}#map=${zoom}/${coords.lat}/${coords.lon}`);
        $("#locationteksti").text(`Leveysaste: ${coords.lat},  pituusaste: ${coords.lon}`);
        $("#tapateskti").text(`Tarkkuus: ${coords.acc} m, sen perusteella sijainti perustuu ${locationTapa}`);
    }
}
function locationError() {
    error = "Sijainti ei ole käytössä";
    $("#locationteksti").text(error);
}

getLocation();