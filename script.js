$(document).ready(main);

var APIKEY = "hxjKEmQx4wbG01nVRU8KG49iWal0wQA3";
var ROOT_URL = "https://dataservice.accuweather.com";
var app = {};
var weekday;
var metric = true;

function main() {
  weekday = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short"
  });

  bindingUI();

  // $.ajaxSetup({
  //   method: "GET",
  //   data: { apikey: APIKEY, metric: true },
  //   beforeSend: function(xhr, settings) {
  //     settings.url = ROOT_URL + settings.url;
  //   }
  // });

  $("#refresh").click(updateWeather);
  $("input[name=degree]").change(changeMetric);
  // $('.card').hover(changeBackground);
}

function forecast(settings) {
  settings = settings || {};
  settings.url = ROOT_URL + settings.url;
  settings.data = settings.data || {};
  settings.data.apikey = APIKEY;
  settings.data.metric = settings.data.metric === undefined
    ? metric
    : settings.data.metric;
  var ajax = $.ajax(settings);
  return ajax;
}

function changeMetric() {
  console.log("changeMetric(");
  metric = $(this).val() == "metric";
  $(".temp").each(function() {
    var curr = Number($(this).text());
    var temp = metric ? (curr - 32) / 1.8 : curr * 1.8 + 32;
    $(this).text(Math.round10(temp, -1));
  });
}

function changeBackground() {
  var src = $(this).children(".weather-bg").prop('src');
  var url = 'url(' + src + ')';
  $('body').css('background-image', url);
}

function bindingUI() {
  app.$ = {};
  app.$.region = $("#region");
  app.$.country = $("#country");
  app.$.city = $("#city");
  app.$.timezone = $("#time-zone");
  app.$.geoposition = $("#geoposition");

  app.$.summary = $("#summary");
  app.$.summaryImg = $("img#current");
  app.$.metric = $("#metric");
  app.$.imperial = $("#imperial");

  app.$.forecast = $("#forecast");
}

function updateWeather() {
  getGeolocation();
}

function getGeolocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(getLocation);
  }
}

function getLocation(pos) {
  console.debug("getLocation(", pos);
  var query = {};
  query.q = pos.coords.latitude + "," + pos.coords.longitude;

  var url = "/locations/v1/cities/geoposition/search";
  forecast({ url: url, data: query })
    .done(showLocation)
    // .done(getCurrentCondition)
    .done(get5daysForecast);
}

function showLocation(location) {
  console.debug("showLocation(", location);
  app.$.region.text(location.Region.LocalizedName);
  app.$.country.text(location.Country.LocalizedName);
  app.$.city.text(location.AdministrativeArea.LocalizedName);
  app.$.timezone.text(location.TimeZone.Name);
  app.$.geoposition.text(
    location.GeoPosition.Latitude + "/" + location.GeoPosition.Longitude
  );
}

function getCurrentCondition(location) {
  console.log("getCurrentCondition(", location);
  var url = "/currentconditions/v1/" + location.Key;
  forecast({ url: url }).done(showCurrentCondition);
}

function showCurrentCondition(condition) {
  console.log("showCurrentCondition(", condition);
  app.$.summary.text(condition.WeatherText);
  app.$.summaryImg.prop(
    "src",
    "https://vortex.accuweather.com/adc2010/images/slate/icons/18" +
      condition.WeatherIcon +
      ".svg"
  );
  app.$.metric.text(condition.Temperature.Metric.Value);
  app.$.imperial.text(condition.Temperature.Imperial.Value);
}

function get5daysForecast(location) {
  console.log("get5daysForecast(", location);
  var url = "/forecasts/v1/daily/5day/" + location.Key;
  forecast({ url: url, data: { metric: metric } })
    .done(showHeadline)
    .done(show5daysForecast);
}

function showHeadline(forecast) {
  $("#tag").text(forecast.Headline.Category);
  $("#text").text(forecast.Headline.Text);
  var begin = forecast.Headline.EffectiveDate;
  $("#begin").text(weekday.format(new Date(begin)));
  var end = forecast.Headline.EndDate;
  $("#end").text(weekday.format(new Date(end)));
}

function show5daysForecast(forecast) {
  console.log("show5daysForecast(", forecast);
  app.$.forecast.fadeOut("slow", function() {
    app.$.forecast.empty();

    $.each(forecast.DailyForecasts, function(index, obj) {
      var $fc = extractDailyForecast(obj);
      $fc.hover(changeBackground);
      app.$.forecast.append($fc);
    });

    app.$.forecast.fadeIn();
  });
}

function extractDailyForecast(forecast) {
  console.log("extractDailyForecast(", forecast);

  var $card = $('<div class="card">');
  var $title = $('<p class="weather-day">');
  $card.append($title);
  var $img = $('<img class="card-img-top weather-icon">');
  $card.append($img);
  var $temp = $('<div class="weather-temp">');
  $card.append($temp);
  var $maxTemp = $('<span class="max-temp temp">');
  $temp.append($maxTemp);
  var $minTemp = $('<span class="min-temp temp">');
  $temp.append($minTemp);
  var $degree = $('<span class="degree">');
  $temp.append($degree);
  var $text = $('<p class="weather-text">');
  $card.append($text);
  var $link = $('<a class="text-muted" target="_blank">');
  $card.append($link);
  var $bg = $('<img class="weather-bg" hidden>');
  $card.append($bg);

  var imgSrc =
    "https://vortex.accuweather.com/adc2010/images/slate/icons/" +
    pad(forecast.Day.Icon) +
    ".svg";
  $img.prop("src", imgSrc);

  var today = new Date();
  var fdate = new Date(forecast.Date);
  var title = today.getDate() === fdate.getDate()
    ? "Today"
    : weekday.format(fdate);

  $title.text(title);
  $text.text(forecast.Day.IconPhrase);

  $minTemp.text(forecast.Temperature.Minimum.Value);
  $maxTemp.text(forecast.Temperature.Maximum.Value);
  $degree.text(forecast.Temperature.Maximum.Unit);

  $link.text(forecast.Sources[0]);
  $link.prop("href", forecast.Link);

  var w = forecast.Day.IconPhrase.replace('t-storms', 'thunderstorms').split("w/");
  var w2 = w[0].split(" ");
  w2 = w2[w2.length - 1];
  
  var query = (w[1] || w2).trim().toLowerCase();
  
  getBackground(query, $bg);

  return $card;
}

function getBackground(query, $bg) {
  console.debug("getBackground(", query);
  $.getJSON({
    url: "https://api.unsplash.com/search/photos",
    data: {
      client_id:
        "315b2a26b47412978028e48e496b299747baa011777629450e6a0cbdc52acb2a",
      query: query
    },
    global: false,
    success: function(data) {
      console.debug(data);
      if (data.results.length !== 0) {
        var index = Math.random() * data.results.length;
        index = Math.floor(index);
        $bg.prop("src", data.results[index].urls.regular);
      }
    }
  });
}

/**
   * Decimal adjustment of a number.
   *
   * @param {String}  type  The type of adjustment.
   * @param {Number}  value The number.
   * @param {Integer} exp   The exponent (the 10 logarithm of the adjustment base).
   * @returns {Number} The adjusted value.
   */
function decimalAdjust(type, value, exp) {
  // If the exp is undefined or zero...
  if (typeof exp === "undefined" || +exp === 0) {
    return Math[type](value);
  }
  value = +value;
  exp = +exp;
  // If the value is not a number or the exp is not an integer...
  if (isNaN(value) || !(typeof exp === "number" && exp % 1 === 0)) {
    return NaN;
  }
  // If the value is negative...
  if (value < 0) {
    return -decimalAdjust(type, -value, exp);
  }
  // Shift
  value = value.toString().split("e");
  value = Math[type](+(value[0] + "e" + (value[1] ? +value[1] - exp : -exp)));
  // Shift back
  value = value.toString().split("e");
  return +(value[0] + "e" + (value[1] ? +value[1] + exp : exp));
}

// Decimal round
if (!Math.round10) {
  Math.round10 = function(value, exp) {
    return decimalAdjust("round", value, exp);
  };
}
// Decimal floor
if (!Math.floor10) {
  Math.floor10 = function(value, exp) {
    return decimalAdjust("floor", value, exp);
  };
}
// Decimal ceil
if (!Math.ceil10) {
  Math.ceil10 = function(value, exp) {
    return decimalAdjust("ceil", value, exp);
  };
}

function pad(num) {
  var str = num + "";
  var pad = "00";
  return pad.substring(0, pad.length - str.length) + str;
}

app.location = {
  Version: 1,
  Key: "353971",
  Type: "City",
  Rank: 85,
  LocalizedName: "Cho Lon",
  EnglishName: "Cho Lon",
  PrimaryPostalCode: "",
  Region: {
    ID: "ASI",
    LocalizedName: "Asia",
    EnglishName: "Asia"
  },
  Country: {
    ID: "VN",
    LocalizedName: "Vietnam",
    EnglishName: "Vietnam"
  },
  AdministrativeArea: {
    ID: "SG",
    LocalizedName: "Ho Chi Minh",
    EnglishName: "Ho Chi Minh",
    Level: 1,
    LocalizedType: "Municipality",
    EnglishType: "Municipality",
    CountryID: "VN"
  },
  TimeZone: {
    Code: "ICT",
    Name: "Asia/Ho_Chi_Minh",
    GmtOffset: 7,
    IsDaylightSaving: false,
    NextOffsetChange: null
  },
  GeoPosition: {
    Latitude: 10.75,
    Longitude: 106.65,
    Elevation: {
      Metric: {
        Value: 3,
        Unit: "m",
        UnitType: 5
      },
      Imperial: {
        Value: 9,
        Unit: "ft",
        UnitType: 0
      }
    }
  },
  IsAlias: false,
  ParentCity: {
    Key: "353981",
    LocalizedName: "Ho Chi Minh City",
    EnglishName: "Ho Chi Minh City"
  },
  SupplementalAdminAreas: [],
  DataSets: []
};

app.currentCondition = {
  LocalObservationDateTime: "2017-06-27T13:20:00+07:00",
  EpochTime: 1498544400,
  WeatherText: "Partly sunny",
  WeatherIcon: 3,
  IsDayTime: true,
  Temperature: {
    Metric: {
      Value: 32.8,
      Unit: "C",
      UnitType: 17
    },
    Imperial: {
      Value: 91,
      Unit: "F",
      UnitType: 18
    }
  },
  MobileLink:
    "http://m.accuweather.com/en/vn/cho-lon/353971/current-weather/353971?lang=en-us",
  Link:
    "http://www.accuweather.com/en/vn/cho-lon/353971/current-weather/353971?lang=en-us"
};

var forecastHourly = {
  DateTime: "2017-06-27T13:00:00+07:00",
  EpochDateTime: 1498543200,
  WeatherIcon: 6,
  IconPhrase: "Mostly cloudy",
  IsDaylight: true,
  Temperature: {
    Value: 91,
    Unit: "F",
    UnitType: 18
  },
  PrecipitationProbability: 43,
  MobileLink:
    "http://m.accuweather.com/en/vn/cho-lon/353971/hourly-weather-forecast/353971?day=1&lang=en-us",
  Link:
    "http://www.accuweather.com/en/vn/cho-lon/353971/hourly-weather-forecast/353971?day=1&hbhhour=13&lang=en-us"
};

app.forecast5days = {
  Headline: {
    EffectiveDate: "2017-06-27T13:00:00+07:00",
    EffectiveEpochDate: 1498543200,
    Severity: 5,
    Text: "A thundershower Tuesday afternoon",
    Category: "thunderstorm",
    EndDate: "2017-06-27T19:00:00+07:00",
    EndEpochDate: 1498564800,
    MobileLink:
      "http://m.accuweather.com/en/vn/cho-lon/353971/extended-weather-forecast/353971?lang=en-us",
    Link:
      "http://www.accuweather.com/en/vn/cho-lon/353971/daily-weather-forecast/353971?lang=en-us"
  },
  DailyForecasts: [
    {
      Date: "2017-06-27T07:00:00+07:00",
      EpochDate: 1498521600,
      Temperature: {
        Minimum: {
          Value: 77,
          Unit: "F",
          UnitType: 18
        },
        Maximum: {
          Value: 91,
          Unit: "F",
          UnitType: 18
        }
      },
      Day: {
        Icon: 17,
        IconPhrase: "Partly sunny w/ t-storms"
      },
      Night: {
        Icon: 41,
        IconPhrase: "Partly cloudy w/ t-storms"
      },
      Sources: ["AccuWeather"],
      MobileLink:
        "http://m.accuweather.com/en/vn/cho-lon/353971/daily-weather-forecast/353971?day=1&lang=en-us",
      Link:
        "http://www.accuweather.com/en/vn/cho-lon/353971/daily-weather-forecast/353971?day=1&lang=en-us"
    },
    {
      Date: "2017-06-28T07:00:00+07:00",
      EpochDate: 1498608000,
      Temperature: {
        Minimum: {
          Value: 77,
          Unit: "F",
          UnitType: 18
        },
        Maximum: {
          Value: 90,
          Unit: "F",
          UnitType: 18
        }
      },
      Day: {
        Icon: 17,
        IconPhrase: "Partly sunny w/ t-storms"
      },
      Night: {
        Icon: 15,
        IconPhrase: "Thunderstorms"
      },
      Sources: ["AccuWeather"],
      MobileLink:
        "http://m.accuweather.com/en/vn/cho-lon/353971/daily-weather-forecast/353971?day=2&lang=en-us",
      Link:
        "http://www.accuweather.com/en/vn/cho-lon/353971/daily-weather-forecast/353971?day=2&lang=en-us"
    },
    {
      Date: "2017-06-29T07:00:00+07:00",
      EpochDate: 1498694400,
      Temperature: {
        Minimum: {
          Value: 77,
          Unit: "F",
          UnitType: 18
        },
        Maximum: {
          Value: 90,
          Unit: "F",
          UnitType: 18
        }
      },
      Day: {
        Icon: 15,
        IconPhrase: "Thunderstorms"
      },
      Night: {
        Icon: 35,
        IconPhrase: "Partly cloudy"
      },
      Sources: ["AccuWeather"],
      MobileLink:
        "http://m.accuweather.com/en/vn/cho-lon/353971/daily-weather-forecast/353971?day=3&lang=en-us",
      Link:
        "http://www.accuweather.com/en/vn/cho-lon/353971/daily-weather-forecast/353971?day=3&lang=en-us"
    },
    {
      Date: "2017-06-30T07:00:00+07:00",
      EpochDate: 1498780800,
      Temperature: {
        Minimum: {
          Value: 77,
          Unit: "F",
          UnitType: 18
        },
        Maximum: {
          Value: 90,
          Unit: "F",
          UnitType: 18
        }
      },
      Day: {
        Icon: 16,
        IconPhrase: "Mostly cloudy w/ t-storms"
      },
      Night: {
        Icon: 36,
        IconPhrase: "Intermittent clouds"
      },
      Sources: ["AccuWeather"],
      MobileLink:
        "http://m.accuweather.com/en/vn/cho-lon/353971/daily-weather-forecast/353971?day=4&lang=en-us",
      Link:
        "http://www.accuweather.com/en/vn/cho-lon/353971/daily-weather-forecast/353971?day=4&lang=en-us"
    },
    {
      Date: "2017-07-01T07:00:00+07:00",
      EpochDate: 1498867200,
      Temperature: {
        Minimum: {
          Value: 77,
          Unit: "F",
          UnitType: 18
        },
        Maximum: {
          Value: 90,
          Unit: "F",
          UnitType: 18
        }
      },
      Day: {
        Icon: 4,
        IconPhrase: "Intermittent clouds"
      },
      Night: {
        Icon: 35,
        IconPhrase: "Partly cloudy"
      },
      Sources: ["AccuWeather"],
      MobileLink:
        "http://m.accuweather.com/en/vn/cho-lon/353971/daily-weather-forecast/353971?day=5&lang=en-us",
      Link:
        "http://www.accuweather.com/en/vn/cho-lon/353971/daily-weather-forecast/353971?day=5&lang=en-us"
    }
  ]
};

var forecastDaily = {
  // http://dataservice.accuweather.com/forecasts/v1/daily/1day/353971.json?apikey=hxjKEmQx4wbG01nVRU8KG49iWal0wQA3&metric=True
  Headline: {
    EffectiveDate: "2017-06-27T13:00:00+07:00",
    EffectiveEpochDate: 1498543200,
    Severity: 5,
    Text: "A thunderstorm Tuesday afternoon",
    Category: "thunderstorm",
    EndDate: "2017-06-27T19:00:00+07:00",
    EndEpochDate: 1498564800,
    MobileLink:
      "http://m.accuweather.com/en/vn/cho-lon/353971/extended-weather-forecast/353971?lang=en-us",
    Link:
      "http://www.accuweather.com/en/vn/cho-lon/353971/daily-weather-forecast/353971?lang=en-us"
  },
  DailyForecasts: [
    {
      Date: "2017-06-27T07:00:00+07:00",
      EpochDate: 1498521600,
      Temperature: {
        Minimum: { Value: 77.0, Unit: "F", UnitType: 18 },
        Maximum: { Value: 91.0, Unit: "F", UnitType: 18 }
      },
      Day: { Icon: 17, IconPhrase: "Partly sunny w/ t-storms" },
      Night: { Icon: 41, IconPhrase: "Partly cloudy w/ t-storms" },
      Sources: ["AccuWeather"],
      MobileLink:
        "http://m.accuweather.com/en/vn/cho-lon/353971/daily-weather-forecast/353971?day=1&lang=en-us",
      Link:
        "http://www.accuweather.com/en/vn/cho-lon/353971/daily-weather-forecast/353971?day=1&lang=en-us"
    }
  ]
};