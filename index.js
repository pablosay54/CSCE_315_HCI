var express = require('express');
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.json());
var path = require('path');
var mongodb = require('mongodb');
var mongourl = 'mongodb+srv://mongoaccessaccount:PackAdvisor123@packadvisordatabase-hp7rv.gcp.mongodb.net/test?retryWrites=true&w=majority';
const mongoClient = mongodb.MongoClient(mongourl);

var listOfLists = [];

// Called once to setup the mongo client
async function dbSetup()
{
    await mongoClient.connect();
    // Setting these statically because they're not gonna change usually
    // If they do, we need to restart the server
    setListOfDefaultLists();
}

async function setListOfDefaultLists()
{
    mongoClient.db('users').collection("lists").find(
        {email: "johnsmith@gmail.com"}
    ).toArray(function (err, result)
    {
        if (err)
            throw err;
        

        var lists = result[0].lists;
        // Go through the results and assign the lists
        for (var i = 0; i < lists.length; ++ i)
        {
            var items = lists[i].items;
            var itemList = [];
            for (var j = 0; j < items.length; ++ j)
            {
                itemList.push ({
                    name: items[j],
                    checked: false
                });

            }
            listOfLists.push({name: lists[i].name, items: itemList})
        }

    });
}
async function getoutletdata(countryname)
{
    mongoClient.db('countries').collection("outletlookup").find(
        {Country: countryname}
    ).toArray(function (err, result)
    {
        if (err)
        

            throw err;
        

        console.log(result)
        return(result)
    });
}

dbSetup();

app.use('/frontEnd', express.static(__dirname + '/frontEnd'));

app.get('/', function (req, res)
{ // When server requests '/' page
    res.sendFile(path.join(__dirname + '/frontEnd/html/index.html'));
});

app.get('/newTrip.html', function (req, res)
{
    res.sendFile(path.join(__dirname + '/frontEnd/html/newTrip.html'));
});

app.get('/tripInfo.html', function (req, res)
{ // This one's gonna need some information about the trip too
    res.sendFile(path.join(__dirname + '/frontEnd/html/tripInfo.html'));
});

app.get('/default-lists', function (req, res)
{ // let 5 days be default duration of journey
    var numDays = 5;
    if (req.headers.numdays)
    {
        numDays = parseInt(req.headers.numdays);
    }

    res.json(getDefaultLists(numDays));
});

function getDefaultLists(numDays)
{
    if (numDays == 5)
        return listOfLists;
    

    var toReturn = JSON.parse(JSON.stringify(listOfLists));

    var normalizedDays = Math.min(numDays, 10);
    // Do some number of days specific stuff here for the lists
    toReturn[1].items[0].name = normalizedDays + " " + toReturn[1].items[0].name;
    toReturn[1].items[1].name = normalizedDays + " " + toReturn[1].items[1].name
    toReturn[1].items[2].name = (normalizedDays + 1) + " " + toReturn[1].items[2].name
    toReturn[1].items[3].name = normalizedDays + " " + toReturn[1].items[3].name
    toReturn[1].items[4].name = Math.ceil(normalizedDays / 2) + " " + toReturn[1].items[4].name

    return toReturn;
}

function normalizeTripbase(tripbase)
{
    var keys = Object.keys(tripbase)
    for (var i = 0; i < keys.length; ++i)
    {
        if(keys[i] != "lists")
            tripbase[keys[i]] = JSON.stringify(tripbase[keys[i]]).replace(/\"/g, "")
    }

    return tripbase
}

app.post('/newtripdata', function (req, res)
{
    var tripbase = normalizeTripbase(req.body)
    if (tripbase.email == "")
        res.send("No email :(")
    
    mongoClient.db('users').collection('tripbase').updateOne(
        {
            email: tripbase.email,
            tripid: tripbase.tripid
        },
        {
            $set: {
                start_date: tripbase.start_date,
                end_date: tripbase.end_date,
                departure_city: tripbase.departure_city,
                departure_countryCode: tripbase.departure_countryCode,
                arrival_city: tripbase.arrival_city,
                arrival_countryCode: tripbase.arrival_countryCode,
                lists: tripbase.lists
            }
        },
        {upsert: true}
    );
    //     mongoClient.db('users').collection('tripbase').find(
    //         {
    //             email: JSON.stringify(tripbase.email).replace(/\"/g, ""),
    //             start_date: JSON.stringify(tripbase.start_date).replace(/\"/g, ""),
    //             end_date: JSON.stringify(tripbase.end_date).replace(/\"/g, ""),
    //             arrival_countryCode: JSON.stringify(tripbase.arrival_countryCode).replace(/\"/g, ""),
    //             arrival_city: JSON.stringify(tripbase.arrival_city).replace(/\"/g, ""),
    //             departure_city: JSON.stringify(tripbase.departure_city).replace(/\"/g, ""),
    //             departure_countryCode: JSON.stringify(tripbase.departure_countryCode).replace(/\"/g, "")
    //         }
    //     ).toArray(function (err, check)
    //     {
    //         if (check[0] == undefined)
    //         {
    //             mongoClient.db('users').collection('tripbase').find(
    //                 {
    //                     email: JSON.stringify(tripbase.email).replace(/\"/g, "")
    //                 }
    //             ).sort(
    //                 {trip_id: -1}
    //             ).limit(1).toArray(function (err, result)
    //             {
    //                 var tripidnew = 0
    //                 if (err)
                    

    //                     throw err;
                    

    //                 if (result[0] == undefined)
    //                 {
    //                     trip_idnew = 1
    //                 }
    //                 else
    //                 {
    //                     trip_idnew = parseInt(result[0].trip_id) + 1
    //                 } tripbase["trip_id"] = trip_idnew.toString()
    //                 mongoClient.db('users').collection('tripbase').insertOne(tripbase)
    //             });
    //         }
    //     });
    // }
    res.send("success")
});

app.get('/outletdata', function (req, res)
{
    var outletdataholder = {}
    mongoClient.db('countries').collection("outletlookup").find(
        {
            Country: JSON.stringify(req.headers.country).replace(/\"/g, "")
        }
    ).toArray(function (err, result1)
    {
        if (err)
            throw err;
        

        if (result1[0] != undefined)
        {
            res.json(result1)
        }
        else
        {
            mongoClient.db('countries').collection("outletlookup").find(
                {
                    Country: JSON.stringify(req.headers.country_alt).replace(/\"/g, "")
                }
            ).toArray(function (err, result2)
            {
                if (err)
                
                    throw err;
                

                res.json(result2)
            });
        }
    });
});

app.get('/old-trips', function (req, res)
{
    // let 5 days be default duration of journey
    var useremail = JSON.stringify(req.headers.email).replace(/\"/g, "");
    
    if (useremail == "")
    {
        res.send("[]");
    }

    mongoClient.db("users").collection("tripbase").find({email: useremail}).toArray(function(err, result)
    {
        if (err) throw err;
        res.json(result);
    });
});


let port = process.env.PORT;
if (port == null || port == "")
{
    port = 3000;
}
app.listen(port);